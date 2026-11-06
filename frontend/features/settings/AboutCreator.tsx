import { ArrowUpRight } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa6";

const LINKS = [
  { label: "GitHub", href: "https://github.com/mohityadav24952-ai", Icon: FaGithub },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/mohit-kumar-yadav-177642350/", Icon: FaLinkedin },
];

/** A small credits card for the bottom of the Settings page. */
export function AboutCreator() {
  return (
    <section aria-labelledby="about-creator-h" className="animate-in relative overflow-hidden rounded-3xl border border-edge-strong bg-surface p-6 md:p-8">
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
        <span aria-hidden="true" className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-edge-strong bg-primary/15 text-xl font-bold text-primary shadow-pop">
          MY
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">About the creator</p>
          <h2 id="about-creator-h" className="sr-only">About the creator</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
            <strong className="font-semibold text-fg">Mohit Kumar Yadav</strong> is a Full-Stack AI Engineer and elite Competitive
            Programmer (LeetCode Knight, 4★ CodeChef). Passionate about algorithmic problem-solving and Agentic AI, he built
            ONEstopPlacement to revolutionize tech interview prep. He also secured AIR 269 in the UPSC NDA-153 exam,
            demonstrating strong leadership and composure under pressure.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {LINKS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-edge-strong px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-fg">
                  <Icon aria-hidden="true" /> {label}
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
