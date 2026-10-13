// DEMO DATA ONLY. These values are invented to preview the layout.
// Never show them without a visible "Demo data" label.

export type DemoStat = {
  id: string;
  label: string;
  value: string;
  hint: string;
};

export const demoStats: DemoStat[] = [
  {
    id: "repos",
    label: "Public repositories",
    value: "12",
    hint: "Sample value",
  },
  {
    id: "solved",
    label: "Problems solved",
    value: "180",
    hint: "Sample value",
  },
  {
    id: "rating",
    label: "Best contest rating",
    value: "1650",
    hint: "Sample value",
  },
  {
    id: "resumes",
    label: "Approved resumes",
    value: "2",
    hint: "Sample value",
  },
];
