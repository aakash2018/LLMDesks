export function AgentCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 rounded bg-muted" />
          <div className="h-3 w-14 rounded-full bg-muted" />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-3/4 rounded bg-muted" />
      </div>
      <div className="mt-3 h-5 w-16 rounded-full bg-muted" />
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-7 w-20 rounded-md bg-muted" />
      </div>
    </div>
  );
}
