"""Maps a company to its page on the Hynts company-wise DSA sheet.

Source: https://hynts.in/preparation/company-wise-dsa-sheet/ . The slugs below were read from that index
page and every resulting URL was requested on 2026-11-06 (each answers 200 after Hynts' own redirect to the
trailing-slash form). We never build a URL for a company that is not in this table, because a made-up page
that 404s is worse than the honest fallback. If Hynts adds or renames companies, update HYNTS_SLUGS.

The match is on whole words only (no substring guessing), so "Metaverse Labs" does not become "Meta".
"""
import re

from app.modules.interview.resources import clean_company

HYNTS_HOST = "hynts.in"
HYNTS_SHEET_INDEX = "https://hynts.in/preparation/company-wise-dsa-sheet/"
_BASE = HYNTS_SHEET_INDEX

HYNTS_SLUGS = frozenset({
    "accenture", "adobe", "amazon", "apple", "atlassian", "barclays", "bloomberg", "capgemini", "cisco",
    "cognizant", "cred", "de-shaw", "flipkart", "goldman-sachs", "google", "hcl", "hsbc", "infosys", "intuit",
    "jpmorgan-chase", "linkedin", "mastercard", "meesho", "meta", "microsoft", "morgan-stanley", "netflix",
    "oracle", "paypal", "paytm", "phonepe", "razorpay", "salesforce", "servicenow", "stripe", "swiggy", "tcs",
    "tech-mahindra", "tower-research", "uber", "visa", "walmart", "wipro", "zepto", "zomato",
})

# Common ways people type a company that differ from Hynts' slug. Keys are clean_company() output.
ALIASES = {
    "facebook": "meta", "meta platforms": "meta",
    "jp morgan": "jpmorgan-chase", "jpmorgan": "jpmorgan-chase", "jp morgan chase": "jpmorgan-chase",
    "jpmorgan chase": "jpmorgan-chase", "j p morgan": "jpmorgan-chase", "chase": "jpmorgan-chase",
    "goldman": "goldman-sachs", "deshaw": "de-shaw", "d e shaw": "de-shaw", "de shaw": "de-shaw",
    "tata consultancy services": "tcs", "tata consultancy": "tcs",
    "hcltech": "hcl", "hcl tech": "hcl", "service now": "servicenow", "phone pe": "phonepe",
    "tech mahindra": "tech-mahindra", "techmahindra": "tech-mahindra", "tower research capital": "tower-research",
    "paypal holdings": "paypal", "mastercard worldwide": "mastercard",
}


def hynts_slug(company: str | None) -> str | None:
    c = clean_company(company)
    if not c:
        return None
    slug = ALIASES.get(c) or "-".join(re.findall(r"[a-z0-9]+", c))
    return slug if slug in HYNTS_SLUGS else None


def hynts_url(company: str | None) -> str | None:
    """The company's Hynts sheet URL, or None when Hynts has no sheet for it."""
    slug = hynts_slug(company)
    return f"{_BASE}{slug}-dsa-interview-questions/" if slug else None
