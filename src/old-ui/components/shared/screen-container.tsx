import { cn } from "@/lib/utils";

interface ScreenContainerProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function ScreenContainer({
  children,
  className,
  noPadding = false,
}: ScreenContainerProps) {
  return (
    <div
      className={cn(
        "flex flex-col min-h-screen",
        !noPadding && "px-4",
        className
      )}
    >
      {children}
    </div>
  );
}
