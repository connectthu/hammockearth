"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  {
    label: "Dashboard",
    href: "/members/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Events",
    href: "/events",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    label: "Farm Days",
    href: null,
    comingSoon: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22V12m0 0C12 7 7 5 3 6c0 5 3 9 9 6zm0 0c0-5 5-7 9-6-1 5-4 9-9 6z" />
      </svg>
    ),
  },
  {
    label: "Community",
    href: "/members/community",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5.356-3.779M9 20H4v-2a4 4 0 015.356-3.779M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zm-14 0a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    label: "Content Library",
    href: "/library",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/members/__username__",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export function MemberSidebar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .single();
      if ((data as any)?.username) setUsername((data as any).username);
    });
  }, []);

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 sticky top-16 h-[calc(100vh-4rem)] border-r border-linen bg-white overflow-y-auto">
      <div className="px-5 py-6 border-b border-linen">
        <p className="font-serif text-base text-soil leading-tight">Hammock Earth</p>
        <p className="text-xs text-charcoal/50 italic mt-0.5">Member Portal</p>
        <p className="text-[10px] text-charcoal/30 uppercase tracking-widest mt-0.5">The Living Room</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const href = item.href === "/members/__username__"
            ? (username ? `/members/${username}` : "/members/profile/edit")
            : item.href;
          const isActive = href ? pathname === href || pathname.startsWith(href + "/") : false;

          if (item.comingSoon || !href) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-charcoal/30 cursor-default select-none"
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
                <span className="ml-auto text-[10px] font-medium bg-linen text-charcoal/40 px-1.5 py-0.5 rounded-full leading-none">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isActive
                  ? "bg-clay/10 text-clay font-medium"
                  : "text-charcoal/60 hover:bg-linen hover:text-soil"
              }`}
            >
              <span className={`shrink-0 ${isActive ? "text-clay" : ""}`}>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
