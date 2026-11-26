import { requirePagePermission } from "@/server/auth/current-user";
import { can } from "@/server/authz/permissions";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requirePagePermission("complaint:moderate", "/admin");
  const tabs = [
    { href: "/admin", label: "Dib-u-eegis" },
    { href: "/admin/reports", label: "Warbixinnada" },
    ...(can(user.role, "user:manage")
      ? [
          { href: "/admin/users", label: "Isticmaalayaasha" },
          { href: "/admin/invitations", label: "Casuumadaha" },
          { href: "/admin/categories", label: "Qaybaha" },
          { href: "/admin/audit", label: "Diiwaanka" },
        ]
      : []),
  ];
  return (
    <div>
      <div className="mb-4 px-1 sm:px-0">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">Maamulka</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Dib u eeg cabashooyinka, xalli warbixinnada, maamul nidaamka.</p>
      </div>
      <AdminTabs tabs={tabs} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
