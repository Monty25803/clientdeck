import { cn } from "@/lib/utils";

const tones = {
  draft: "bg-paper-2 text-muted",
  review: "bg-[rgba(180,83,9,0.12)] text-[var(--warn)]",
  changes: "bg-[rgba(186,23,94,0.12)] text-[var(--accent)]",
  approved: "bg-[rgba(47,107,79,0.12)] text-[var(--ok)]",
  ink: "bg-ink text-paper",
};

export function Badge({
  className,
  tone = "ink",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
