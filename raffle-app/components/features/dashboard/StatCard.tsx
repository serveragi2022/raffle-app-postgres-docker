import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  progress,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  progress?: { value: number; max: number; suffix?: string };
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-md bg-primary-fixed text-primary flex items-center justify-center">
          <Icon size={20} />
        </div>
        {trend && (
          <span className="text-label-md text-on-secondary-container bg-secondary-container rounded-full px-2 py-1">
            {trend}
          </span>
        )}
      </div>
      <p className="text-body-md text-on-surface-variant mb-1">{label}</p>
      <p className="text-headline-md text-on-surface">
        {value}
        {progress && (
          <span className="text-body-lg text-on-surface-variant font-normal"> / {progress.max}</span>
        )}
      </p>
      {progress && (
        <div className="mt-3">
          <Progress value={progress.value} max={progress.max} />
        </div>
      )}
    </Card>
  );
}
