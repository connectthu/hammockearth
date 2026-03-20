"use client";

import { useEffect, useState } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  role: string;
  membership_type: string | null;
  membership_status: string | null;
  created_at: string;
}

const ROLE_BADGES: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-800",
  collaborator: "bg-blue-100 text-blue-800",
  member: "bg-green-100 text-green-800",
  event_customer: "bg-yellow-100 text-yellow-800",
  genpop: "bg-gray-100 text-gray-600",
};

const MEMBERSHIP_BADGES: Record<string, string> = {
  season_pass: "bg-clay/15 text-clay",
  farm_friend: "bg-moss/15 text-moss",
  try_a_month: "bg-moss/15 text-moss",
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_BADGES[role] ?? ROLE_BADGES.genpop;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {role}
    </span>
  );
}

function MembershipBadge({ type, status }: { type: string | null; status: string | null }) {
  if (!type || type === "none") {
    return <span className="text-xs text-gray-400">—</span>;
  }
  const cls = MEMBERSHIP_BADGES[type] ?? "bg-gray-100 text-gray-600";
  const label = type.replace(/_/g, " ");
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
      {status && status !== "active" && (
        <span className="ml-1 opacity-60">({status})</span>
      )}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch(`${API_URL}/memberships/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load users");
        setLoading(false);
      });
  }, []);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-soil">Users</h1>
        {!loading && (
          <span className="text-sm text-soil/50">{users.length} total</span>
        )}
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by name, email, or username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
        />
      </div>

      {loading && <p className="text-sm text-soil/50">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-2xl border border-linen overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-linen text-left">
                <th className="px-4 py-3 font-medium text-soil/60">Name</th>
                <th className="px-4 py-3 font-medium text-soil/60">Email</th>
                <th className="px-4 py-3 font-medium text-soil/60">Username</th>
                <th className="px-4 py-3 font-medium text-soil/60">Role</th>
                <th className="px-4 py-3 font-medium text-soil/60">Membership</th>
                <th className="px-4 py-3 font-medium text-soil/60">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-soil/40">
                    No users found
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-linen/60 last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-3 text-soil">{u.full_name ?? <span className="text-soil/30">—</span>}</td>
                  <td className="px-4 py-3 text-soil/70">{u.email}</td>
                  <td className="px-4 py-3 text-soil/60">{u.username ? `@${u.username}` : <span className="text-soil/30">—</span>}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <MembershipBadge type={u.membership_type} status={u.membership_status} />
                  </td>
                  <td className="px-4 py-3 text-soil/50 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString("en-CA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
