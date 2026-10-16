import type { SpecRow } from "./types";

/** "Label: value" per line  <->  [{label, value}] */
export function parseSpecs(text: string): SpecRow[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf(":");
      return i === -1 ? { label: line, value: "" } : { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
    })
    .filter((r) => r.label);
}

export function specsToText(specs: unknown): string {
  if (!Array.isArray(specs)) return "";
  return (specs as SpecRow[]).map((s) => `${s.label}: ${s.value}`).join("\n");
}
