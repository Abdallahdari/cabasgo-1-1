"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, LogOut, Settings, ShieldCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { api, errorMessage } from "@/lib/api-client";
import { ROLE_LABELS, type Role } from "@/lib/constants";

export function UserMenu({ name, role }: { name: string; role: Role }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function logout() {
    startTransition(async () => {
      try {
        await api("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full p-1 pr-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="Menu-ga akoonka"
      >
        <UserAvatar name={name} size={44} />
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-semibold text-foreground">{name}</div>
          <div className="text-xs font-normal text-muted-foreground">{ROLE_LABELS[role]}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/me/complaints">
            <FileText /> Cabashooyinkayga
          </Link>
        </DropdownMenuItem>
        {role !== "CITIZEN" ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <ShieldCheck /> Maamulka
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Dejinta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} disabled={pending} variant="destructive">
          <LogOut /> Ka bax
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
