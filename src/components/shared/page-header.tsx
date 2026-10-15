import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3 pt-5 pb-4", className)}>
      <div className="min-w-0">
        {subtitle && <p className="label-caps mb-1">{subtitle}</p>}
        <h1 className="font-display text-[32px] leading-none font-bold text-foreground">{title}</h1>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
