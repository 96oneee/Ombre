import { Sidebar } from "@/components/admin/Sidebar";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  const settings = await getSettings();
  return (
    <>
      <Sidebar email={user.email ?? ""} brand={settings.brand_name} />
      <div className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </div>
    </>
  );
}
