import type { SectionName } from "@/lib/api/profile";

export type FieldKind = "text" | "textarea" | "date" | "select" | "list";

export type FieldDef = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: string[];
  hint?: string;
};

export type SectionDef = {
  name: SectionName;
  title: string;
  singular: string;
  fields: FieldDef[];
  /** Fields shown on the collapsed card: [heading, subheading]. */
  heading: string;
  sub?: string[];
};

export const SECTIONS: SectionDef[] = [
  {
    name: "education",
    title: "Education",
    singular: "education entry",
    heading: "institution",
    sub: ["degree", "field", "grade"],
    fields: [
      { name: "institution", label: "Institution", kind: "text", required: true },
      { name: "degree", label: "Degree", kind: "text" },
      { name: "field", label: "Field of study", kind: "text" },
      { name: "start_date", label: "Start date", kind: "date" },
      { name: "end_date", label: "End date", kind: "date" },
      { name: "grade", label: "Grade (optional)", kind: "text" },
    ],
  },
  {
    name: "experience",
    title: "Experience",
    singular: "experience",
    heading: "title",
    sub: ["organization"],
    fields: [
      { name: "title", label: "Role", kind: "text", required: true },
      { name: "organization", label: "Organization", kind: "text", required: true },
      { name: "start_date", label: "Start date", kind: "date" },
      { name: "end_date", label: "End date", kind: "date" },
      {
        name: "description_points",
        label: "What you did",
        kind: "list",
        hint: "One point per line. Only things you actually did.",
      },
    ],
  },
  {
    name: "projects",
    title: "Projects",
    singular: "project",
    heading: "title",
    sub: ["tech"],
    fields: [
      { name: "title", label: "Title", kind: "text", required: true },
      { name: "description", label: "Description", kind: "textarea" },
      { name: "tech", label: "Technologies", kind: "list", hint: "Comma or line separated." },
      { name: "links", label: "Links", kind: "list", hint: "https:// links, one per line." },
      { name: "contribution", label: "Your contribution", kind: "textarea" },
      {
        name: "outcomes",
        label: "Outcomes",
        kind: "list",
        hint: "One per line. Include numbers only if they are real and you can show them.",
      },
    ],
  },
  {
    name: "skills",
    title: "Skills",
    singular: "skill",
    heading: "name",
    sub: ["category", "level"],
    fields: [
      { name: "name", label: "Skill", kind: "text", required: true },
      { name: "category", label: "Category", kind: "text" },
      {
        name: "level",
        label: "Self-assessed level",
        kind: "select",
        options: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
      },
    ],
  },
  {
    name: "achievements",
    title: "Achievements and certifications",
    singular: "achievement",
    heading: "title",
    sub: ["issuer", "type"],
    fields: [
      { name: "title", label: "Title", kind: "text", required: true },
      {
        name: "type",
        label: "Type",
        kind: "select",
        options: ["AWARD", "CERTIFICATION", "COMPETITION", "OTHER"],
      },
      { name: "issuer", label: "Issuer", kind: "text" },
      { name: "date", label: "Date", kind: "date" },
      { name: "url", label: "Link", kind: "text", hint: "Must start with https://" },
    ],
  },
];

/** Convert form text into the API shape for a field. */
export function toApiValue(field: FieldDef, raw: string): unknown {
  const value = raw.trim();
  if (field.kind === "list") {
    return value
      .split(field.name === "tech" ? /[,\n]/ : /\n/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return value === "" ? null : value;
}

export function toFormValue(field: FieldDef, value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.join(field.name === "tech" ? ", " : "\n");
  }
  return String(value);
}
