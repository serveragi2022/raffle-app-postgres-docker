import { cn } from "@/lib/utils/cn";

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100));
  return (
    <div className={cn("h-2 w-full rounded-full bg-surface-container-high overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r from-primary to-primary-container transition-all", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
