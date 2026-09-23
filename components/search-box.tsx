"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function SearchBox() {
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q");
    if (typeof query !== "string" || query.trim().length < 2) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form onSubmit={onSubmit} className="relative min-w-0 flex-1 max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        name="q"
        type="search"
        minLength={2}
        placeholder="Search projects, assets, comments"
        className="h-10 w-full rounded-full border border-rule bg-white/70 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-accent/30"
      />
    </form>
  );
}
