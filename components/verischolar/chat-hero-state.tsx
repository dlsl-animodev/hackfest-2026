export function ChatHeroState() {
  return (
    <section className="relative flex flex-col items-center justify-center px-4 py-4 text-center sm:px-6 lg:px-10">
      <div className="absolute left-1/2 top-8 h-52 w-52 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(197,154,94,0.18),transparent_72%)] blur-3xl" />
      <div className="absolute bottom-4 left-[20%] h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(93,127,99,0.14),transparent_70%)] blur-3xl" />

      <div className="relative w-full max-w-[760px]">
        <div className="mx-auto inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.78)] px-3.5 py-1.5 text-[0.68rem] tracking-[0.18em] text-[var(--muted)] uppercase shadow-[var(--shadow-soft)] backdrop-blur-xl">
          Conversation-first research shell
          <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
          Philippine context aware
        </div>

        <div className="mt-5 space-y-3">
          <p className="text-[0.78rem] font-bold tracking-[0.28em] text-[var(--muted)] uppercase">
            Research, reinvented
          </p>
          <h1 className="type-display text-[clamp(2.1rem,5vw,3.7rem)] leading-[0.96] text-[var(--ink)]">
            Ask once.
            <br />
            Watch the evidence form.
          </h1>
          <p className="mx-auto max-w-[46rem] text-[0.92rem] leading-6 text-[color:rgba(82,67,56,0.86)] sm:text-[0.98rem]">
            VeriScholar now behaves like a guided research conversation:
            submit a question, follow the retrieval steps, then work directly
            from a credibility-ranked source board.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-left">
          {[
            {
              label: "Immediate feedback",
              detail: "Live activity",
            },
            {
              label: "Credibility-first",
              detail: "Ranked evidence",
            },
            {
              label: "Board-ready",
              detail: "Pin and synthesize",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.64)] px-3.5 py-2 shadow-[0_14px_34px_rgba(108,82,54,0.05)]"
            >
              <p className="text-[0.72rem] tracking-[0.16em] text-[var(--muted)] uppercase">
                {item.label} · {item.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
