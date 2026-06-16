import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: StatsCardProps) {
  return (
    <div className="bg-heuse-dark border border-heuse-border rounded-sm p-6 hover:border-heuse-gold/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-heuse-muted uppercase tracking-wider">
            {title}
          </p>
          <p className="text-3xl font-heading font-semibold text-heuse-cream">
            {value}
          </p>
          {description && (
            <p className="text-xs text-heuse-muted">{description}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-500" : "text-heuse-crimson"
              )}
            >
              {trend.isPositive ? "+" : "-"}
              {trend.value}% from last month
            </p>
          )}
        </div>
        <div className="p-3 bg-heuse-gold/10 rounded-sm">
          <Icon className="h-6 w-6 text-heuse-gold" />
        </div>
      </div>
    </div>
  );
}
