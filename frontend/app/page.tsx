const swatches = [
  { name: "primary", className: "bg-primary" },
  { name: "data", className: "bg-data" },
  { name: "ai", className: "bg-ai" },
  { name: "ok", className: "bg-ok" },
  { name: "warn", className: "bg-warn" },
  { name: "err", className: "bg-err" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-data">
          Stage 1 placeholder
        </p>
        <h1 className="font-display mt-2 text-4xl font-bold sm:text-5xl">
          ONEstopPlacement
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          AI career copilot for placement preparation. The dashboard will be
          built here in the next stages.
        </p>
      </div>

      <section className="rounded-lg border border-edge bg-surface p-5">
        <h2 className="font-display text-lg font-semibold">Design tokens</h2>
        <p className="mt-1 text-sm text-muted">
          If you can see six coloured squares below, the tokens are working.
        </p>
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {swatches.map((s) => (
            <li key={s.name} className="text-center">
              <div className={`h-10 rounded-md ${s.className}`} />
              <span className="mt-1 block text-xs text-muted">{s.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
