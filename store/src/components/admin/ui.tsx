import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-body text-2xl font-medium tracking-normal">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-neutral-200 bg-white p-5 md:p-6", className)}>
      {title && <h2 className="mb-4 font-body text-lg font-medium tracking-normal">{title}</h2>}
      {children}
    </section>
  );
}

/** Success / error banner driven by ?ok= and ?error= in the URL (set by server actions). */
export function Flash({ ok, error }: { ok?: string | string[]; error?: string | string[] }) {
  const o = Array.isArray(ok) ? ok[0] : ok;
  const e = Array.isArray(error) ? error[0] : error;
  if (!o && !e) return null;
  return (
    <p role={e ? "alert" : "status"} className={cn("mb-5 rounded-md p-3 text-sm", e ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800")}>
      {e || o}
    </p>
  );
}

export function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="badge" style={{ background: `${color}1f`, color }}>
      {label}
    </span>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">{children}</tbody>
      </table>
      {!hasRows && <p className="p-6 text-center text-neutral-500">{empty ?? "Nothing here yet."}</p>}
    </div>
  );
}

export function LinkButton({ href, children, variant = "outline" }: { href: string; children: React.ReactNode; variant?: "primary" | "outline" }) {
  return (
    <Link href={href} className={cn("btn btn-sm", variant === "primary" ? "btn-primary" : "btn-outline")}>
      {children}
    </Link>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
