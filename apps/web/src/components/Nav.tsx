"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const links = [
  { label: "About", href: "/#about" },
  { label: "Events", href: "/events" },
  { label: "Programs", href: "/#programs" },
  { label: "Library", href: "/library" },
  { label: "Membership", href: "/#membership" },
  { label: "Visit", href: "/#visit" },
  { label: "Team", href: "/#team" },
  { label: "Connect", href: "/#newsletter" },
];

interface AuthUser {
  name: string;
  avatarUrl: string | null;
}

export function Nav() {
  const [open, setOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser({
          name: session.user.user_metadata?.full_name ?? session.user.email ?? "Member",
          avatarUrl: session.user.user_metadata?.avatar_url ?? null,
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser({
          name: session.user.user_metadata?.full_name ?? session.user.email ?? "Member",
          avatarUrl: session.user.user_metadata?.avatar_url ?? null,
        });
      } else {
        setAuthUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
    window.location.href = "/";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-linen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Hammock Earth" className="h-8 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-charcoal/70 hover:text-soil transition-colors"
              >
                {l.label}
              </a>
            ))}
            {authUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 text-sm text-soil font-medium hover:text-clay transition-colors"
                >
                  {authUser.avatarUrl ? (
                    <img src={authUser.avatarUrl} alt={authUser.name} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-clay/20 text-clay text-xs font-semibold flex items-center justify-center">
                      {authUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {authUser.name.split(" ")[0]}
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-linen overflow-hidden">
                    <Link
                      href="/members/dashboard"
                      className="block px-4 py-2.5 text-sm text-soil hover:bg-linen transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-charcoal/60 hover:bg-linen transition-colors border-t border-linen"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/members/login"
                className="text-sm text-clay font-medium hover:text-clay/80 transition-colors"
              >
                Member login
              </Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-soil" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-cream border-t border-linen px-4 py-4 space-y-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block text-charcoal/70 hover:text-soil py-1"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          {authUser ? (
            <>
              <Link
                href="/members/dashboard"
                className="flex items-center gap-2 text-soil font-medium py-1"
                onClick={() => setOpen(false)}
              >
                {authUser.avatarUrl ? (
                  <img src={authUser.avatarUrl} alt={authUser.name} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-clay/20 text-clay text-xs font-semibold flex items-center justify-center">
                    {authUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
                {authUser.name}
              </Link>
              <button
                onClick={handleLogout}
                className="block text-sm text-charcoal/50 hover:text-soil py-1"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              href="/members/login"
              className="block text-clay font-medium py-1"
              onClick={() => setOpen(false)}
            >
              Member login
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
