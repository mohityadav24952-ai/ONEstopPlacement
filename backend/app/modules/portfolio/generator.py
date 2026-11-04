"""Deterministic static-site generator. Themes are presentation only: CSS plus one shared template.
The output contains no JavaScript and every value is HTML-escaped."""
import io
import zipfile

from jinja2 import Environment, select_autoescape

from app.modules.portfolio.content import PortfolioContent

ACCENTS = {"blue": "#2563eb", "green": "#15803d", "purple": "#7c3aed", "orange": "#c2410c"}

_BASE_CSS = """
*{box-sizing:border-box}body{margin:0;font-family:var(--font);background:var(--bg);color:var(--fg);line-height:1.6}
main{max-width:760px;margin:0 auto;padding:48px 20px 80px}h1{font-size:2.2rem;margin:0}h2{margin:2.2rem 0 .6rem;font-size:1.15rem;
text-transform:uppercase;letter-spacing:.06em;color:var(--accent)}.headline{color:var(--muted);font-size:1.1rem;margin:.3rem 0 0}
a{color:var(--accent)}ul{padding-left:1.1rem}.card{border:1px solid var(--edge);border-radius:10px;padding:14px 16px;margin:10px 0;background:var(--card)}
.card h3{margin:0 0 .2rem;font-size:1.05rem}.tags span{display:inline-block;font-size:.8rem;border:1px solid var(--edge);border-radius:99px;padding:1px 9px;margin:2px 4px 2px 0;color:var(--muted)}
.skills li{display:inline-block;list-style:none;margin:2px 6px 2px 0}.preview-banner{background:#fde68a;color:#451a03;padding:8px 14px;font:600 14px sans-serif;text-align:center}
"""

THEMES = {
    "minimal": {
        "name": "Minimal", "description": "Clean light page with generous spacing.",
        "css": ":root{--bg:#fff;--fg:#111827;--muted:#4b5563;--edge:#e5e7eb;--card:#fff;--font:system-ui,-apple-system,Segoe UI,sans-serif}",
    },
    "midnight": {
        "name": "Midnight", "description": "Dark theme with soft cards.",
        "css": ":root{--bg:#0b1220;--fg:#e5ecf9;--muted:#9fb0cf;--edge:#23304d;--card:#111a2e;--font:system-ui,-apple-system,Segoe UI,sans-serif}",
    },
    "classic": {
        "name": "Classic", "description": "Serif typography for a traditional look.",
        "css": ":root{--bg:#faf7f2;--fg:#1f1b16;--muted:#5c5348;--edge:#ddd3c4;--card:#fffdf9;--font:Georgia,'Times New Roman',serif}",
    },
}

_TEMPLATE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{{ csp }}">
<title>{{ c.hero.name or 'Portfolio' }}</title>
{% if inline_css %}<style>{{ css }}</style>{% else %}<link rel="stylesheet" href="style.css">{% endif %}
</head><body>
{% if preview %}<div class="preview-banner">Preview only. This page is not public.</div>{% endif %}
<main>
<header><h1>{{ c.hero.name }}</h1>{% if c.hero.headline %}<p class="headline">{{ c.hero.headline }}</p>{% endif %}</header>
{% if 'about' in c.sections and c.about.text %}<section><h2>About</h2><p>{{ c.about.text }}</p></section>{% endif %}
{% if 'projects' in c.sections and c.projects %}<section><h2>Projects</h2>
{% for p in c.projects %}<article class="card"><h3>{{ p.title }}</h3>{% if p.blurb %}<p>{{ p.blurb }}</p>{% endif %}
{% if p.tech %}<div class="tags">{% for t in p.tech %}<span>{{ t }}</span>{% endfor %}</div>{% endif %}
{% for l in p.links if l | safe_url %}<p><a href="{{ l }}" rel="noopener noreferrer">{{ l }}</a></p>{% endfor %}</article>{% endfor %}</section>{% endif %}
{% if 'skills' in c.sections and c.skills_groups %}<section><h2>Skills</h2>
{% for g in c.skills_groups %}<p><strong>{{ g.group }}</strong></p><ul class="skills">{% for s in g.skills %}<li>{{ s }}</li>{% endfor %}</ul>{% endfor %}</section>{% endif %}
{% if 'education' in c.sections and c.education %}<section><h2>Education</h2>
{% for e in c.education %}<p>{{ e.institution }}{% if e.degree %}, {{ e.degree }}{% endif %}</p>{% endfor %}</section>{% endif %}
{% if 'achievements' in c.sections and c.achievements %}<section><h2>Achievements</h2><ul>
{% for a in c.achievements %}<li>{{ a.title }}</li>{% endfor %}</ul></section>{% endif %}
{% if 'contact' in c.sections and (c.contact.include_email or c.contact.include_location) %}<section><h2>Contact</h2>
{% if c.contact.include_email and c.contact.email %}<p>{{ c.contact.email }}</p>{% endif %}
{% if c.contact.include_location and c.contact.location %}<p>{{ c.contact.location }}</p>{% endif %}</section>{% endif %}
</main></body></html>
"""

_env = Environment(autoescape=select_autoescape(default=True, default_for_string=True))
_env.filters["safe_url"] = lambda u: isinstance(u, str) and u.lower().startswith("https://")
_template = _env.from_string(_TEMPLATE)


def theme_css(theme_id: str, options: dict) -> str:
    accent = ACCENTS.get(options.get("accent", "blue"), ACCENTS["blue"])
    return f":root{{--accent:{accent}}}{THEMES[theme_id]['css']}{_BASE_CSS}"


def render_html(content: PortfolioContent, theme_id: str, options: dict, *, preview: bool) -> str:
    css = theme_css(theme_id, options)
    style_src = "'unsafe-inline'" if preview else "'self'"
    csp = f"default-src 'none'; style-src {style_src}; img-src data:; base-uri 'none'; form-action 'none'"
    return _template.render(c=content, preview=preview, inline_css=preview, css=css, csp=csp)


README = """# Your portfolio

This folder is a static website: index.html and style.css. It contains no scripts.

## Publish it (pick one)
- Netlify: drag this folder onto https://app.netlify.com/drop
- Vercel: install the Vercel CLI and run `vercel --prod` in this folder
- GitHub Pages: push these files to a repository, then Settings > Pages

Review index.html before publishing: everything in it will be public.
"""


def build_zip(content: PortfolioContent, theme_id: str, options: dict) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("index.html", render_html(content, theme_id, options, preview=False))
        z.writestr("style.css", theme_css(theme_id, options))
        z.writestr("README.md", README)
    return buf.getvalue()
