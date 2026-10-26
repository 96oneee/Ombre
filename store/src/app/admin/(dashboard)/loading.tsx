/** Shown straight away while an admin page loads its data. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-ink/10" />
      <div className="h-32 rounded bg-ink/5" />
      <div className="h-64 rounded bg-ink/5" />
    </div>
  );
}
