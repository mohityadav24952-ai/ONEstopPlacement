"use client";

import { ImageIcon } from "lucide-react";
import type { PortfolioAchievement, PortfolioData, PortfolioEducation, PortfolioExperience, PortfolioProject } from "@/types/portfolio";
import { Field, ItemList, TagInput, TextArea, newId } from "@/features/site-builder/studio/fields";

type Props = { data: PortfolioData; onChange: (next: PortfolioData) => void };
const opt = (v: string) => (v.trim() ? v.trim() : undefined);
const GH_REPO = /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i;

/** Builds the same screenshot link the backend uses: live site via Microlink, else the GitHub preview card. */
export function screenshotFor(live?: string, github?: string): string | undefined {
  if (live) return `https://api.microlink.io/?url=${encodeURIComponent(live)}&screenshot=true&meta=false&embed=screenshot.url`;
  const m = github ? GH_REPO.exec(github) : null;
  return m ? `https://opengraph.githubassets.com/1/${m[1]}/${m[2].replace(/\.git$/, "")}` : undefined;
}

export function BasicsEditor({ data, onChange }: Props) {
  const b = data.basics;
  const set = (patch: Partial<typeof b>) => onChange({ ...data, basics: { ...b, ...patch } });
  const social = (key: keyof typeof b.socials) => ({
    value: b.socials[key] ?? "",
    onChange: (v: string) => set({ socials: { ...b.socials, [key]: opt(v) } }),
  });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" value={b.fullName} onChange={(v) => set({ fullName: v })} />
        <Field label="Headline" value={b.headline} onChange={(v) => set({ headline: v })} placeholder="e.g. Full-Stack Engineer" />
        <Field label="Email" type="email" value={b.email} onChange={(v) => set({ email: v })} maxLength={320} />
        <Field label="Location" value={b.location} onChange={(v) => set({ location: v })} />
        <Field label="Phone (kept private, never shown on your public page)" value={b.phone ?? ""} onChange={(v) => set({ phone: opt(v) })} maxLength={40} />
        <Field label="Availability" value={b.availabilityText} onChange={(v) => set({ availabilityText: v })} placeholder="e.g. Open to 2026 internships" />
        <Field label="Resume link (https)" value={b.resumeUrl ?? ""} onChange={(v) => set({ resumeUrl: opt(v) })} maxLength={500} hint="Link to your resume PDF, e.g. a Google Drive share link. Shows a Download Resume button." />
        <Field label="Avatar image link (https)" value={b.avatarUrl ?? ""} onChange={(v) => set({ avatarUrl: opt(v) })} maxLength={500} />
      </div>
      <TextArea label="Short bio (600 characters max)" value={b.shortBio} onChange={(v) => set({ shortBio: v })} rows={3} maxLength={600} />
      <TextArea label="Long bio" value={b.longBio} onChange={(v) => set({ longBio: v })} rows={5} maxLength={6000} />
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold">Social links (full https links)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["github", "linkedin", "twitter", "leetcode", "codechef", "codeforces", "website"] as const).map((k) => (
            <Field key={k} label={k[0].toUpperCase() + k.slice(1)} {...social(k)} maxLength={500} placeholder="https://" />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function ProjectsEditor({ data, onChange }: Props) {
  return (
    <ItemList
      items={data.projects}
      onChange={(projects) => onChange({ ...data, projects })}
      title={(p, i) => p.title || `Project ${i + 1}`}
      addLabel="Add project"
      empty="No projects yet. Add one, or upload your resume to import them."
      onAdd={(): PortfolioProject => ({ id: newId("p"), title: "", tagline: "", description: "", techStack: [], featured: false })}
      render={(p, up) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" value={p.title} onChange={(v) => up({ title: v })} />
            <Field label="Tagline" value={p.tagline} onChange={(v) => up({ tagline: v })} />
            <Field label="GitHub link" value={p.githubUrl ?? ""} onChange={(v) => up({ githubUrl: opt(v) })} maxLength={500} placeholder="https://github.com/you/repo" />
            <Field label="Live demo link" value={p.liveUrl ?? ""} onChange={(v) => up({ liveUrl: opt(v) })} maxLength={500} placeholder="https://" />
            <Field label="Metrics (only what you can back up)" value={p.metrics ?? ""} onChange={(v) => up({ metrics: opt(v) })} />
            <Field label="Year" value={p.year ?? ""} onChange={(v) => up({ year: opt(v) })} maxLength={20} />
          </div>
          <TextArea label="Description" value={p.description} onChange={(v) => up({ description: v })} rows={4} maxLength={3000} />
          <TagInput label="Tech stack" values={p.techStack} onChange={(techStack) => up({ techStack })} />
          <Field label="Image link (https)" value={p.imageUrl ?? ""} onChange={(v) => up({ imageUrl: opt(v) })} maxLength={500} hint="Leave empty to use an automatic screenshot of your live site, or your GitHub card." />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={!screenshotFor(p.liveUrl, p.githubUrl)} onClick={() => up({ imageUrl: screenshotFor(p.liveUrl, p.githubUrl) })}
              className="inline-flex items-center gap-2 rounded-full border border-edge-strong px-3.5 py-1.5 text-sm font-bold hover:border-primary hover:text-primary disabled:opacity-40">
              <ImageIcon className="h-4 w-4" aria-hidden="true" /> Auto-generate screenshot from URL
            </button>
            <label className="inline-flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={p.featured} onChange={(e) => up({ featured: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /> Featured
            </label>
          </div>
        </>
      )}
    />
  );
}

export function ExperienceEditor({ data, onChange }: Props) {
  return (
    <ItemList
      items={data.experience}
      onChange={(experience) => onChange({ ...data, experience })}
      title={(e, i) => [e.role, e.company].filter(Boolean).join(" at ") || `Role ${i + 1}`}
      addLabel="Add role"
      empty="No experience yet. Internships and part-time work count."
      onAdd={(): PortfolioExperience => ({ id: newId("e"), role: "", company: "", location: "", startDate: "", endDate: "", descriptionBullets: [], techUsed: [] })}
      render={(e, up) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Role" value={e.role} onChange={(v) => up({ role: v })} />
            <Field label="Company" value={e.company} onChange={(v) => up({ company: v })} />
            <Field label="Company link" value={e.companyUrl ?? ""} onChange={(v) => up({ companyUrl: opt(v) })} maxLength={500} placeholder="https://" />
            <Field label="Location" value={e.location} onChange={(v) => up({ location: v })} />
            <Field label="Start" value={e.startDate} onChange={(v) => up({ startDate: v })} maxLength={40} placeholder="Jun 2025" />
            <Field label="End" value={e.endDate} onChange={(v) => up({ endDate: v })} maxLength={40} placeholder="Aug 2025 or Present" />
          </div>
          <TextArea label="Highlights (one per line)" rows={4} value={e.descriptionBullets.join("\n")}
            onChange={(v) => up({ descriptionBullets: v.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 15) })} />
          <TagInput label="Tech used" values={e.techUsed} onChange={(techUsed) => up({ techUsed })} />
        </>
      )}
    />
  );
}

const SKILL_GROUPS = [
  ["languages", "Languages"],
  ["frameworks", "Frameworks"],
  ["databasesAndCloud", "Databases & Cloud"],
  ["aiAndMl", "AI & ML"],
  ["coreCsAndTools", "Core CS & Tools"],
] as const;

export function SkillsEditor({ data, onChange }: Props) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {SKILL_GROUPS.map(([key, label]) => (
        <TagInput key={key} label={label} values={data.skills[key]} onChange={(v) => onChange({ ...data, skills: { ...data.skills, [key]: v } })} />
      ))}
    </div>
  );
}

export function EducationAchievementsEditor({ data, onChange }: Props) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="edu-h" className="space-y-3">
        <h3 id="edu-h" className="font-display text-lg font-semibold">Education</h3>
        <ItemList
          items={data.education}
          onChange={(education) => onChange({ ...data, education })}
          title={(e, i) => e.institution || e.degree || `Education ${i + 1}`}
          addLabel="Add education"
          empty="No education added yet."
          onAdd={(): PortfolioEducation => ({ id: newId("ed"), degree: "", institution: "", location: "", startYear: "", endYear: "" })}
          render={(e, up) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Degree" value={e.degree} onChange={(v) => up({ degree: v })} />
              <Field label="Institution" value={e.institution} onChange={(v) => up({ institution: v })} />
              <Field label="Location" value={e.location} onChange={(v) => up({ location: v })} />
              <Field label="Score" value={e.score ?? ""} onChange={(v) => up({ score: opt(v) })} placeholder="CGPA: 8.7/10" />
              <Field label="Start year" value={e.startYear} onChange={(v) => up({ startYear: v })} maxLength={20} />
              <Field label="End year" value={e.endYear} onChange={(v) => up({ endYear: v })} maxLength={20} />
            </div>
          )}
        />
      </section>
      <section aria-labelledby="ach-h" className="space-y-3">
        <h3 id="ach-h" className="font-display text-lg font-semibold">Achievements</h3>
        <ItemList
          items={data.achievements}
          onChange={(achievements) => onChange({ ...data, achievements })}
          title={(a, i) => a.title || `Achievement ${i + 1}`}
          addLabel="Add achievement"
          empty="No achievements added yet."
          onAdd={(): PortfolioAchievement => ({ id: newId("a"), title: "", issuer: "", description: "" })}
          render={(a, up) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title" value={a.title} onChange={(v) => up({ title: v })} />
                <Field label="Issuer" value={a.issuer} onChange={(v) => up({ issuer: v })} />
                <Field label="Date" value={a.date ?? ""} onChange={(v) => up({ date: opt(v) })} maxLength={40} />
                <Field label="Proof link" value={a.proofUrl ?? ""} onChange={(v) => up({ proofUrl: opt(v) })} maxLength={500} placeholder="https://" />
              </div>
              <TextArea label="Description" value={a.description} onChange={(v) => up({ description: v })} rows={2} />
            </>
          )}
        />
      </section>
    </div>
  );
}
