"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addSection, deleteSection, moveSection, saveSection, setSectionVisible } from "@/app/admin/(dashboard)/website/actions";
import { SECTION_TYPES, sectionDef, type FieldDef } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { MediaField, MediaListField } from "./MediaField";

interface SectionRow {
  id: string;
  type: string;
  content: Record<string, any>;
  is_visible: boolean;
}

function FieldInput({ field, value, onChange, products }: { field: FieldDef; value: any; onChange: (v: any) => void; products: { id: string; name: string }[] }) {
  switch (field.type) {
    case "textarea":
      return <textarea rows={4} className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "image":
      return <MediaField kind="image" value={value ?? ""} onChange={onChange} />;
    case "video":
      return <MediaField kind="video" value={value ?? ""} onChange={onChange} />;
    case "images":
      return <MediaListField value={Array.isArray(value) ? value : []} onChange={onChange} />;
    case "select":
      return (
        <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "product":
      return (
        <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">First active product</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      );
    default:
      return <input className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

function SectionCard({ section, index, total, products, onMutate, busy }: { section: SectionRow; index: number; total: number; products: { id: string; name: string }[]; onMutate: (fn: () => Promise<{ ok: boolean; error?: string }>) => void; busy: boolean }) {
  const def = sectionDef(section.type);
  const [content, setContent] = useState<Record<string, any>>({ ...(def?.defaults ?? {}), ...section.content });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!def) return null;

  const title = (content.title as string) || "";
  return (
    <details className="group rounded-xl border border-neutral-200 bg-white">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4">
        <span className="text-neutral-400 group-open:rotate-90" aria-hidden>▸</span>
        <span className="font-medium">{def.label}</span>
        {title && <span className="max-w-[16rem] truncate text-sm text-neutral-500">{title}</span>}
        {!section.is_visible && <span className="badge bg-neutral-200 text-neutral-600">Hidden</span>}
        {dirty && <span className="badge bg-amber-100 text-amber-800">Unsaved</span>}
        <span className="ml-auto flex gap-1" onClick={(e) => e.preventDefault()}>
          <button type="button" className="btn btn-outline btn-sm !px-3" disabled={busy || index === 0} onClick={() => onMutate(() => moveSection(section.id, "up"))} aria-label="Move section up">↑</button>
          <button type="button" className="btn btn-outline btn-sm !px-3" disabled={busy || index === total - 1} onClick={() => onMutate(() => moveSection(section.id, "down"))} aria-label="Move section down">↓</button>
        </span>
      </summary>

      <div className="space-y-5 border-t border-neutral-200 p-5">
        <p className="text-sm text-neutral-500">{def.description}</p>
        {def.fields.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <FieldInput field={f} value={content[f.key]} products={products} onChange={(v) => { setContent((c) => ({ ...c, [f.key]: v })); setDirty(true); setSaved(false); }} />
            {f.help && <p className="hint">{f.help}</p>}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-4">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => onMutate(async () => { const r = await saveSection(section.id, content); if (r.ok) { setDirty(false); setSaved(true); } return r; })}>Save section</button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[#227b92]" checked={section.is_visible} disabled={busy} onChange={(e) => onMutate(() => setSectionVisible(section.id, e.target.checked))} />
            Visible on website
          </label>
          <button type="button" className="btn btn-danger btn-sm ml-auto" disabled={busy} onClick={() => confirm("Delete this section?") && onMutate(() => deleteSection(section.id))}>Delete section</button>
          {saved && <span role="status" className="text-sm text-green-700">Saved</span>}
        </div>
      </div>
    </details>
  );
}

export function SectionEditor({ pageId, sections, products }: { pageId: string; sections: SectionRow[]; products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [newType, setNewType] = useState(SECTION_TYPES[0].type);

  const mutate = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError("");
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      router.refresh();
    });
  };

  return (
    <div>
      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className={cn("space-y-3", pending && "opacity-70")}>
        {sections.map((s, i) => (
          <SectionCard key={s.id} section={s} index={i} total={sections.length} products={products} onMutate={mutate} busy={pending} />
        ))}
        {sections.length === 0 && <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">No sections yet. Add one below.</p>}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-neutral-300 p-4">
        <div>
          <label className="label" htmlFor="new-section">Add a section</label>
          <select id="new-section" className="input" value={newType} onChange={(e) => setNewType(e.target.value)}>
            {SECTION_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => mutate(() => addSection(pageId, newType))}>Add section</button>
        <p className="w-full text-xs text-neutral-500">{SECTION_TYPES.find((t) => t.type === newType)?.description} New sections are added at the bottom; use the arrows to move them.</p>
      </div>
    </div>
  );
}
