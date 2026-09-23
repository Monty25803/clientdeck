import { formatDistanceToNow } from "date-fns";
import { activityLabel } from "@/lib/activity";
import type { Activity, ActivityType, User } from "@prisma/client";

type Row = Activity & { actor: Pick<User, "name"> };

export function ActivityFeed({ items }: { items: Row[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">The timeline is empty. Uploads, comments, and approvals will land here.</p>;
  }

  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="relative pl-5">
          <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-accent" />
          <p className="text-sm">
            <span className="font-semibold">{item.actor.name}</span>{" "}
            {activityLabel(item.type as ActivityType)}
          </p>
          <p className="text-xs text-muted">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
        </li>
      ))}
    </ol>
  );
}
