"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { activityLabel } from "@/lib/activity";
import type { ActivityType } from "@prisma/client";

type Item = {
  id: string;
  type: ActivityType;
  createdAt: string;
  projectId: string;
  projectName: string;
  actorName: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    const res = await fetch("/api/activity", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { items: Item[]; unread: number };
    setItems(data.items);
    setUnread(data.unread);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  async function markRead() {
    setOpen((v) => !v);
    if (!open) {
      await fetch("/api/activity/read", { method: "POST" });
      setUnread(0);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={markRead}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-white/70"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-accent" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-rule bg-paper shadow-card">
          <div className="border-b border-rule px-4 py-3 font-serif text-lg">Activity</div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">No activity yet.</p>
            ) : (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={`/projects/${item.projectId}`}
                  className="block border-b border-rule/70 px-4 py-3 text-sm hover:bg-paper-2"
                  onClick={() => setOpen(false)}
                >
                  <p>
                    <span className="font-semibold">{item.actorName}</span> {activityLabel(item.type)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {item.projectName} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
