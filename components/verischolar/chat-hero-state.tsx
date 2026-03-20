export function ChatHeroState() {
  return (
    <section className="relative flex flex-col items-center justify-center px-4 py-2 text-center sm:px-6 lg:px-8">
      <div className="absolute left-1/2 top-8 h-44 w-44 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(197,154,94,0.18),transparent_72%)] blur-3xl" />
      <div className="absolute bottom-3 left-[22%] h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(93,127,99,0.14),transparent_70%)] blur-3xl" />

      <div className="relative w-full max-w-[720px]">
        <div className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-[var(--line)] bg-[rgba(255,252,245,0.78)] px-3 py-1.5 text-[0.62rem] tracking-[0.18em] text-[var(--muted)] uppercase shadow-[var(--shadow-soft)] backdrop-blur-xl">
          Conversation-first research shell
          <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />
          Philippine context aware
        </div>

        <div className="mt-4 space-y-2.5">
          <p className="text-[0.7rem] font-bold tracking-[0.26em] text-[var(--muted)] uppercase">
            Research, reinvented
          </p>
          <h1 className="type-display text-[clamp(1.85rem,4.4vw,3.15rem)] leading-[0.94] text-[var(--ink)]">
            What should we verify today?
          </h1>
          <p className="mx-auto max-w-[42rem] text-[0.84rem] leading-[1.7] text-[color:rgba(82,67,56,0.86)] sm:text-[0.9rem]">
            VeriScholar now behaves like a guided research conversation:
            submit a question, follow the retrieval steps, then work directly
            from a credibility-ranked source board.
          </p>
        </div>
      </div>
    </section>
  );
}
