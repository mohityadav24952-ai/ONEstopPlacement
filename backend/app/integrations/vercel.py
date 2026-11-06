"""Vercel REST API: deploy a portfolio's static snapshot as a production deployment.

Option A: every portfolio is its own project (VERCEL_PROJECT_PREFIX + handle) in ONE Vercel account, the
one VERCEL_TOKEN belongs to. Flow, per the Vercel REST API docs:

  1. POST /v2/files          each file's bytes, identified by its SHA-1 (x-vercel-digest). Uploading by hash
                             avoids request-size limits on inlined files and lets Vercel skip unchanged ones.
  2. POST /v13/deployments   {name, files: [{file, sha, size}], target: "production", projectSettings}.
                             The project is created on its first deployment.
  3. GET  /v13/deployments/{id}  polled by the UI until readyState is READY or ERROR.

The token never leaves the server and is never logged. Vercel error text is passed on (capped) because it
is about the request (e.g. "project name taken"), never about the token.
"""
import hashlib
import io
import posixpath
import re
import zipfile
from dataclasses import dataclass

import httpx

API = "https://api.vercel.com"
MAX_FILES = 200
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_TOTAL_BYTES = 25 * 1024 * 1024
DEPLOYMENT_ID_RE = re.compile(r"^dpl_[A-Za-z0-9]{6,64}$")
SKIP_FILES = {"README.txt"}  # the ZIP's how-to-deploy note has no place on the live site

# Vercel readyState -> what the UI shows. BLOCKED (e.g. a plan limit) is a failure for our purposes.
STATES = {
    "QUEUED": "queued", "INITIALIZING": "initializing", "BUILDING": "building",
    "READY": "ready", "ERROR": "error", "CANCELED": "canceled", "BLOCKED": "error",
}
IN_PROGRESS = {"queued", "initializing", "building", "finalizing"}


class VercelError(Exception):
    """A stable `code` for the frontend plus a message that is safe to show to the user."""

    def __init__(self, code: str, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.code, self.message, self.status_code = code, message, status_code


@dataclass
class Deployment:
    id: str
    project: str
    state: str  # queued | initializing | building | finalizing | ready | error | canceled
    url: str | None  # the public https:// address once known
    error: str | None = None

    @property
    def done(self) -> bool:
        return self.state not in IN_PROGRESS


def project_name(prefix: str, handle: str) -> str:
    """Vercel project names: lowercase letters, digits, '.', '_' and '-', at most 100 characters.
    Handles are already validated (3-30 of [a-z0-9-]), so this only normalises and caps."""
    name = re.sub(r"[^a-z0-9._-]", "-", f"{prefix}{handle}".lower()).strip("-.")
    return re.sub(r"-{3,}", "--", name)[:100]


def files_from_zip(data: bytes) -> dict[str, bytes]:
    """The static export ZIP -> {relative path: bytes}. The ZIP comes from our own frontend, but it is
    still treated defensively: no absolute paths, no '..', and size/count limits against a zip bomb."""
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise VercelError("EXPORT_FAILED", "The static export could not be read.") from exc
    files: dict[str, bytes] = {}
    total = 0
    for info in archive.infolist():
        if info.is_dir():
            continue
        name = posixpath.normpath(info.filename.replace("\\", "/"))
        if name.startswith(("/", "../")) or name == ".." or ":" in name:
            raise VercelError("EXPORT_FAILED", "The static export contains an unsafe file path.")
        if name in SKIP_FILES:
            continue
        if len(files) >= MAX_FILES or info.file_size > MAX_FILE_BYTES or total + info.file_size > MAX_TOTAL_BYTES:
            raise VercelError("EXPORT_TOO_LARGE", "The static export is too large to deploy.", 413)
        content = archive.read(info)[: MAX_FILE_BYTES + 1]
        if len(content) > MAX_FILE_BYTES:  # the header lied about the size
            raise VercelError("EXPORT_TOO_LARGE", "The static export is too large to deploy.", 413)
        total += len(content)
        files[name] = content
    if "index.html" not in files:
        raise VercelError("EXPORT_FAILED", "The static export has no index.html.")
    return files


def _public_url(body: dict, project: str) -> str | None:
    """Prefer the production alias (<project>.vercel.app): unlike the one-off deployment URL it is not
    behind Vercel's default Deployment Protection. If that subdomain is taken globally, Vercel assigns a
    variant such as <project>-<suffix>.vercel.app, so take the shortest alias that starts with the name."""
    aliases = [a for a in body.get("alias") or [] if isinstance(a, str)]
    ours = sorted((a for a in aliases if a.startswith(project)), key=len)
    host = (ours or aliases or [None])[0]
    return f"https://{host}" if host else None


def _to_deployment(body: dict, project: str) -> Deployment:
    state = STATES.get(str(body.get("readyState") or "").upper(), "error")
    url = _public_url(body, project)
    if state == "ready" and url is None:
        state = "finalizing"  # built, but the production alias is not assigned yet: keep polling
    error = None
    if state in ("error", "canceled"):
        error = str(body.get("errorMessage") or "Vercel could not build this deployment.")[:300]
    return Deployment(id=str(body.get("id") or ""), project=str(body.get("name") or project), state=state, url=url, error=error)


class VercelClient:
    def __init__(self, token: str, team_id: str = "", timeout: float = 30.0,
                 transport: httpx.BaseTransport | None = None) -> None:
        self._token, self._team_id, self._timeout, self._transport = token, team_id, timeout, transport

    def _http(self) -> httpx.Client:
        return httpx.Client(
            base_url=API, timeout=self._timeout, transport=self._transport,
            headers={"Authorization": f"Bearer {self._token}"},
            params={"teamId": self._team_id} if self._team_id else None,
        )

    @staticmethod
    def _check(resp: httpx.Response) -> None:
        if resp.status_code < 400:
            return
        try:
            detail = str((resp.json().get("error") or {}).get("message") or "")[:300]
        except (ValueError, AttributeError):
            detail = ""
        code = resp.status_code
        if code in (401, 403):
            raise VercelError("VERCEL_AUTH", "The server's Vercel token is invalid, expired or lacks access. "
                                             "Ask the site admin to update VERCEL_TOKEN.", 502)
        if code == 402:
            raise VercelError("VERCEL_PAYMENT", "The Vercel account has a billing problem, so it cannot deploy.", 502)
        if code == 404:
            raise VercelError("NOT_FOUND", "That deployment was not found.", 404)
        if code == 429:
            raise VercelError("RATE_LIMITED", "Vercel's deploy limit was reached. Try again later.", 429)
        if code < 500:
            raise VercelError("VERCEL_REJECTED", f"Vercel rejected the deployment: {detail or f'status {code}'}", 502)
        raise VercelError("VERCEL_UNAVAILABLE", "Vercel is not responding. Try again in a few minutes.", 502)

    def deploy(self, project: str, files: dict[str, bytes]) -> Deployment:
        try:
            with self._http() as http:
                refs = []
                for path, content in files.items():
                    sha = hashlib.sha1(content).hexdigest()  # noqa: S324 - Vercel's content address, not security
                    resp = http.post("/v2/files", content=content, headers={
                        "Content-Type": "application/octet-stream", "x-vercel-digest": sha,
                        "Content-Length": str(len(content)),
                    })
                    self._check(resp)
                    refs.append({"file": path, "sha": sha, "size": len(content)})
                resp = http.post("/v13/deployments", params={"skipAutoDetectionConfirmation": "1"}, json={
                    "name": project,
                    "files": refs,
                    "target": "production",
                    # A plain static folder: no framework, no build step.
                    "projectSettings": {"framework": None},
                })
                self._check(resp)
                return _to_deployment(resp.json(), project)
        except httpx.HTTPError as exc:
            raise VercelError("VERCEL_UNAVAILABLE", "Could not reach Vercel. Try again in a few minutes.") from exc

    def get(self, deployment_id: str, project: str) -> Deployment:
        """Status of one deployment. Raises NOT_FOUND unless it belongs to `project`, so one user can never
        read another user's deployment by guessing its id."""
        if not DEPLOYMENT_ID_RE.match(deployment_id or ""):
            raise VercelError("NOT_FOUND", "That deployment was not found.", 404)
        try:
            with self._http() as http:
                resp = http.get(f"/v13/deployments/{deployment_id}")
        except httpx.HTTPError as exc:
            raise VercelError("VERCEL_UNAVAILABLE", "Could not reach Vercel. Try again in a few minutes.") from exc
        self._check(resp)
        body = resp.json()
        if body.get("name") != project:
            raise VercelError("NOT_FOUND", "That deployment was not found.", 404)
        deployment = _to_deployment(body, project)
        if deployment.state in ("ready", "finalizing"):
            domain = self.production_domain(project)
            if domain:
                deployment.url, deployment.state = f"https://{domain}", "ready"
        return deployment

    def production_domain(self, project: str) -> str | None:
        """The project's own production domain, e.g. osp-asha.vercel.app (GET /v9/projects/{name}/domains).

        These are the addresses Vercel's default Deployment Protection leaves public, unlike the per-deployment
        and team-scoped aliases, which ask visitors to log in. If `<project>.vercel.app` was already taken
        on Vercel, this is the variant Vercel actually assigned. None if the lookup fails, so the alias from
        the deployment is used instead."""
        try:
            with self._http() as http:
                resp = http.get(f"/v9/projects/{project}/domains")
        except httpx.HTTPError:
            return None
        if resp.status_code != 200:
            return None
        try:
            domains = resp.json().get("domains") or []
        except (ValueError, AttributeError):
            return None
        usable = [d["name"] for d in domains if isinstance(d, dict) and isinstance(d.get("name"), str)
                  and d.get("verified", True) and not d.get("redirect") and not d.get("gitBranch")]
        usable.sort(key=lambda n: (not n.endswith(".vercel.app"), len(n)))  # the free address first, shortest
        return usable[0] if usable else None
