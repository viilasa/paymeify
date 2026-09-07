export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-[6px] bg-elevated" />
        <div className="h-4 w-64 max-w-full rounded-[6px] bg-elevated/70" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-card border border-border bg-elevated/40" />
        <div className="h-24 rounded-card border border-border bg-elevated/40" />
        <div className="h-24 rounded-card border border-border bg-elevated/40" />
      </div>
      <div className="h-48 rounded-card border border-border bg-elevated/30" />
    </div>
  );
}
