import { apiFetch } from "@/lib/api/client";

export type SectionName =
  | "education"
  | "experience"
  | "achievements"
  | "skills"
  | "projects";

export type Profile = {
  id: string;
  display_name: string | null;
  headline: string | null;
  target_roles: string[];
  graduation_year: number | null;
  location_pref: string | null;
  summary: string | null;
  version: number;
};

export type Completeness = {
  percent: number;
  sections: Record<string, boolean>;
};

export type MeResponse = {
  id: string;
  email: string | null;
  profile: Profile;
  completeness: Completeness;
};

export type SectionItem = {
  id: string;
  source_type: string;
  verification_state: string;
  [field: string]: unknown;
};

export type Proposal = {
  id: string;
  section: SectionName;
  action: "create" | "update" | "delete";
  target_id: string | null;
  payload: Record<string, unknown>;
  base_profile_version: number;
  source: string;
  status: string;
};

export type ProfileUpdate = Partial<
  Omit<Profile, "id" | "version">
> & { expected_version: number };

const json = { "Content-Type": "application/json" };

export const getMe = () =>
  apiFetch<MeResponse>("/api/v1/me", { cache: "no-store" });

export const updateProfile = (body: ProfileUpdate) =>
  apiFetch<Profile>("/api/v1/profile", {
    method: "PATCH",
    headers: json,
    body: JSON.stringify(body),
  });

export const listSection = (section: SectionName) =>
  apiFetch<SectionItem[]>(`/api/v1/profile/${section}`, { cache: "no-store" });

export const createItem = (
  section: SectionName,
  body: Record<string, unknown>,
) =>
  apiFetch<SectionItem>(`/api/v1/profile/${section}`, {
    method: "POST",
    headers: json,
    body: JSON.stringify(body),
  });

export const updateItem = (
  section: SectionName,
  id: string,
  body: Record<string, unknown>,
) =>
  apiFetch<SectionItem>(`/api/v1/profile/${section}/${id}`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify(body),
  });

export const deleteItem = (section: SectionName, id: string) =>
  apiFetch<void>(`/api/v1/profile/${section}/${id}`, { method: "DELETE" });

export const listProposals = () =>
  apiFetch<Proposal[]>("/api/v1/profile/proposals", { cache: "no-store" });

export const decideProposal = (id: string, decision: "approve" | "reject") =>
  apiFetch<Proposal>(`/api/v1/profile/proposals/${id}/${decision}`, {
    method: "POST",
  });
