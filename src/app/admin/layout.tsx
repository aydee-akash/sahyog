import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [callbacks, review] = await Promise.all([
    prisma.callbackRequest.count({ where: { handled: false } }),
    prisma.scheme.count({ where: { status: "IN_REVIEW" } }),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr] xl:grid-cols-[250px_1fr]">
      <AdminSidebar counts={{ callbacks, review }} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
