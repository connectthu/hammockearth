"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { label: "Events", href: "/events" },
  { label: "Series", href: "/series" },
  { label: "Members", href: "/memberships" },
  { label: "Waitlist signups", href: "/waitlist" },
  { label: "Facilitator inquiries", href: "/facilitator-inquiries" },
  { label: "Content", href: "/content" },
  { label: "Communications", href: "/communications" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) setAuthed(true);
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    // Store the password as the bearer token — validated server-side by NestJS
    localStorage.setItem("admin_token", password);
    setAuthed(true);
    setPassword("");
    setError("");
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setAuthed(false);
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-linen w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="Hammock Earth" className="h-8 mx-auto mb-4" />
            <h1 className="font-serif text-xl text-soil">Admin Access</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-linen focus:outline-none focus:ring-2 focus:ring-clay/30 text-sm"
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full bg-clay text-white font-medium py-3 rounded-full hover:bg-clay/90 transition-colors text-sm"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Top nav */}
      <header className="bg-soil text-cream px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-serif text-sm">Hammock Earth Admin</span>
          <nav className="hidden sm:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors ${
                  pathname.startsWith(item.href)
                    ? "text-clay"
                    : "text-cream/70 hover:text-cream"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-cream/50 hover:text-cream transition-colors"
        >
          Log out
        </button>
      </header>

      <main className="p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}
