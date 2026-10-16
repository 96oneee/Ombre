import { redirect } from "next/navigation";

/** Redirect back to a page with a success/error message shown in a banner. */
export function flash(path: string, kind: "ok" | "error", message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(message)}`);
}
