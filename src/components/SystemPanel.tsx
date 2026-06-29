export default function SystemPanel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        "system-in relative rounded-md border border-system-border/70 bg-system-panel/70 shadow-system " +
        className
      }
    >
      {title && (
        <header className="border-b border-system-border/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-system-accent system-glow">
          {title}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
