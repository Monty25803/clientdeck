import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  showWordmark = false,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/clientdeck-logo.png"
        alt=""
        className="h-10 w-10 rounded-xl object-cover shadow-sm"
      />
      {showWordmark && (
        <span className="font-serif text-2xl leading-none tracking-tight">ClientDeck</span>
      )}
    </span>
  );
}
