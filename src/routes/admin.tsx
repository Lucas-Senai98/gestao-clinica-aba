import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guard";

export const Route = createFileRoute("/admin")({
  beforeLoad: requireRole("admin"),
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
