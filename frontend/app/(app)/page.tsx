import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { ModuleCard } from "@/components/shared/ModuleCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { modules, nextSteps } from "@/features/home/content";
import { demoStats } from "@/lib/demo-data";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Welcome to ONEstopPlacement"
        description="One workspace for your coding profile, resume, interview preparation and portfolio. Nothing is connected yet, so start with the steps below."
      />

      <Card
        title="Get started"
        description="Three steps that unlock everything else."
      >
        <ol className="space-y-3">
          {nextSteps.map((step, index) => (
            <li
              key={step.href}
              className="flex flex-col gap-3 rounded-md border border-edge p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{step.title}</p>
                  <p className="text-sm text-muted">{step.description}</p>
                </div>
              </div>
              <Link
                href={step.href}
                className={buttonClasses({
                  variant: "secondary",
                  size: "sm",
                  className: "shrink-0",
                })}
              >
                {step.cta}
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <section aria-labelledby="modules-heading">
        <h2
          id="modules-heading"
          className="font-display mb-3 text-lg font-semibold"
        >
          Your modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((m) => (
            <ModuleCard
              key={m.href}
              href={m.href}
              title={m.title}
              description={m.description}
              icon={m.icon}
              statusLabel="Not set up"
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="preview-heading">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2
            id="preview-heading"
            className="font-display text-lg font-semibold"
          >
            Overview preview
          </h2>
          <DemoBadge />
        </div>
        <p className="mb-3 text-sm text-muted">
          These numbers are samples that show how your overview will look. They
          are not your data.
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {demoStats.map((s) => (
            <StatCard
              key={s.id}
              label={s.label}
              value={s.value}
              hint={s.hint}
              demo
            />
          ))}
        </div>
      </section>
    </div>
  );
}
