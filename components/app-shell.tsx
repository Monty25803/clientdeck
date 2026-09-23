import Link from "next/link";
import { CircleHelp, FolderKanban, Settings2 } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { SearchBox } from "@/components/search-box";
import { SignOutButton } from "@/components/sign-out-button";
import { BrandMark } from "@/components/brand-mark";
import { initials } from "@/lib/utils";
import type { SessionUser } from "@/lib/rbac";
import { isAgency } from "@/lib/rbac";

type Org = {
  name: string;
  logoUrl?: string | null;
};

export function AppShell({
  user,
  org,
  children,
}: {
  user: SessionUser;
  org: Org;
  children: React.ReactNode;
}) {
  const agency = isAgency(user.role);

  return (
    <div className="agency-shell min-h-dvh md:h-dvh md:grid md:grid-cols-[240px_minmax(0,1fr)] md:overflow-hidden">
      <aside className="flex flex-col justify-between bg-ink px-5 py-6 text-paper md:h-dvh md:overflow-hidden">
        <div>
          <Link href="/dashboard" className="flex items-center gap-3">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
            ) : (
              <BrandMark inverted className="[&>svg]:h-10 [&>svg]:w-10" />
            )}
            <div>
              <p className="font-serif text-xl leading-none">{org.name}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-paper/55">ClientDeck</p>
            </div>
          </Link>
          <nav className="mt-10 space-y-1 text-sm">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-paper/85 hover:bg-white/8"
            >
              <FolderKanban className="h-4 w-4" />
              {agency ? "Projects" : "Your projects"}
            </Link>
            {user.role === "ADMIN" && (
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-paper/85 hover:bg-white/8"
              >
                <Settings2 className="h-4 w-4" />
                Studio settings
              </Link>
            )}
            <Link
              href="/help"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-paper/85 hover:bg-white/8"
            >
              <CircleHelp className="h-4 w-4" />
              How to use
            </Link>
          </nav>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl bg-white/8 p-4">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-paper/50">
              {user.role.replace("_", " ")}
            </p>
          </div>
          <p className="px-1 text-[11px] text-paper/40">ClientDeck · AGPLv3. Source is this instance.</p>
        </div>
      </aside>
      <div className="flex min-w-0 min-h-0 flex-col md:h-dvh">
        <header className="flex shrink-0 items-center justify-between border-b border-rule bg-paper/90 px-6 py-4 backdrop-blur">
          <SearchBox />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-paper-2 text-xs font-semibold">
              {initials(user.name)}
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
