"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, TrendingUp, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/old/home", icon: Home, label: "Home" },
  { href: "/old/workout", icon: Dumbbell, label: "Workout" },
  { href: "/old/progress", icon: TrendingUp, label: "Progress" },
  { href: "/old/exercises", icon: BookOpen, label: "Exercises" },
  { href: "/old/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-around px-2 pb-5 pt-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/") && href !== "/";
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-[52px]",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-all",
                  active && "scale-110"
                )}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
