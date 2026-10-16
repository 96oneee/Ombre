"use client";
import { useState } from "react";

/** Colour picker + hex text box that stay in sync. Submits the hex value as `name`. */
export function ColorInput({ name, defaultValue = "" }: { name: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  return (
    <div className="flex gap-2">
      <input type="color" aria-label="Pick a color" value={valid ? value : "#cccccc"} onChange={(e) => setValue(e.target.value)} className="h-[46px] w-14 shrink-0 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1" />
      <input name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder="#c9b79c" maxLength={7} className="input" />
    </div>
  );
}
