/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Move one row up or down inside a group by rewriting sort_order (10, 20, 30 ...).
 * `scope` adds the filters that define the group (e.g. same product).
 */
export async function reorderRows(
  supabase: any,
  table: string,
  scope: (q: any) => any,
  id: string,
  dir: "up" | "down",
  tieBreaker = "created_at",
): Promise<void> {
  const { data, error } = await scope(supabase.from(table).select("id"))
    .order("sort_order", { ascending: true })
    .order(tieBreaker, { ascending: true });
  if (error) throw new Error(error.message);
  const ids: string[] = (data ?? []).map((r: { id: string }) => r.id);
  const i = ids.indexOf(id);
  if (i < 0) return;
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const results = await Promise.all(
    ids.map((rid, idx) => supabase.from(table).update({ sort_order: (idx + 1) * 10 }).eq("id", rid)),
  );
  const failed = results.find((r: any) => r.error);
  if (failed) throw new Error(failed.error.message);
}
