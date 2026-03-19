"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

type Grant = {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  note: string | null;
  created_at: string;
};

type UserResult = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email: string;
};

function Initials({ name }: { name: string | null }) {
  const letters = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-clay/20 text-clay text-xs font-medium flex items-center justify-center shrink-0">
      {letters}
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  if (url) {
    return <img src={url} alt={name ?? ""} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  }
  return <Initials name={name} />;
}

export default function EventAccessGrantsPage() {
  const { id } = useParams<{ id: string }>();
  const [eventTitle, setEventTitle] = useState<string>("");
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [note, setNote] = useState("");
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState("");

  const [revoking, setRevoking] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadPage();
  }, [id]);

  async function loadPage() {
    setLoading(true);
    try {
      const [events, grantsData] = await Promise.all([
        apiGet<any[]>("/events/admin"),
        apiGet<Grant[]>(`/events/${id}/access-grants`),
      ]);
      const event = events.find((e: any) => e.id === id);
      setEventTitle(event?.title ?? "");
      setGrants(grantsData);
    } catch {
      setError("Failed to load page.");
    } finally {
      setLoading(false);
    }
  }

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await apiGet<UserResult[]>(
        `/events/${id}/access-grants/users/search?q=${encodeURIComponent(q)}`
      );
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [id]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setSearchQuery(q);
    setSelectedUser(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 300);
  }

  async function handleGrant() {
    if (!selectedUser) return;
    setGranting(true);
    setGrantError("");
    try {
      await apiPost(`/events/${id}/access-grants`, {
        userId: selectedUser.id,
        note: note.trim() || undefined,
      });
      setSelectedUser(null);
      setSearchQuery("");
      setSearchResults([]);
      setNote("");
      await loadGrants();
    } catch (e: any) {
      setGrantError(e?.message?.includes("409") ? "User already has access." : "Failed to grant access.");
    } finally {
      setGranting(false);
    }
  }

  async function loadGrants() {
    const data = await apiGet<Grant[]>(`/events/${id}/access-grants`);
    setGrants(data);
  }

  async function handleRevoke(userId: string) {
    setRevoking(userId);
    try {
      await apiDelete(`/events/${id}/access-grants/${userId}`);
      setGrants((prev) => prev.filter((g) => g.user_id !== userId));
    } catch {
      alert("Failed to revoke access.");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <AdminShell>
      <div className="mb-6">
        <Link href="/events" className="text-sm text-charcoal/50 hover:text-soil">
          ← Back to Events
        </Link>
        <div className="mt-3 flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl text-soil">Access Grants</h1>
            {eventTitle && (
              <p className="text-sm text-charcoal/60 mt-1">{eventTitle}</p>
            )}
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-moss/10 text-moss">
            {grants.length} {grants.length === 1 ? "person" : "people"} granted access
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grant Access */}
      <div className="bg-white rounded-2xl border border-linen p-6 mb-6">
        <h2 className="font-medium text-soil mb-4">Grant Access</h2>

        <div className="relative mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name or email"
            className="w-full border border-linen rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/20"
          />
          {searching && (
            <span className="absolute right-3 top-3 text-xs text-charcoal/40">Searching…</span>
          )}
        </div>

        {!selectedUser && searchResults.length > 0 && (
          <div className="border border-linen rounded-xl overflow-hidden mb-3">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setSelectedUser(u);
                  setSearchResults([]);
                  setSearchQuery("");
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-linen/40 text-left border-b border-linen last:border-0"
              >
                <Avatar url={u.avatar_url} name={u.full_name} />
                <div>
                  <p className="text-sm font-medium text-soil">{u.full_name ?? u.username ?? "Unknown"}</p>
                  <p className="text-xs text-charcoal/50">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="mb-3">
            <div className="flex items-center gap-3 border border-clay/20 bg-clay/5 rounded-xl px-4 py-2.5 mb-3">
              <Avatar url={selectedUser.avatar_url} name={selectedUser.full_name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-soil truncate">
                  {selectedUser.full_name ?? selectedUser.username ?? "Unknown"}
                </p>
                <p className="text-xs text-charcoal/50 truncate">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-charcoal/40 hover:text-charcoal text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for access (optional)"
              className="w-full border border-linen rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/20 mb-3"
            />
            {grantError && (
              <p className="text-sm text-red-600 mb-2">{grantError}</p>
            )}
            <button
              onClick={handleGrant}
              disabled={granting}
              className="inline-flex items-center gap-2 bg-clay text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50"
            >
              {granting ? "Granting…" : "Grant Access"}
            </button>
          </div>
        )}
      </div>

      {/* Current Grants */}
      <div className="bg-white rounded-2xl border border-linen overflow-hidden">
        <div className="px-6 py-4 border-b border-linen">
          <h2 className="font-medium text-soil">Current Access Holders</h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-charcoal/50 text-sm">Loading…</div>
        ) : grants.length === 0 ? (
          <div className="text-center py-12 text-charcoal/50 text-sm">No access grants yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-linen bg-linen/50">
                <th className="text-left px-4 py-3 font-medium text-charcoal/60">Name</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden md:table-cell">Note</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden lg:table-cell">Date Granted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {grants.map((g) => (
                <tr key={g.id} className="border-b border-linen last:border-0 hover:bg-linen/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar url={g.avatar_url} name={g.full_name} />
                      <span className="font-medium text-soil">{g.full_name ?? "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-charcoal/60 hidden sm:table-cell">{g.email}</td>
                  <td className="px-4 py-3 text-charcoal/60 hidden md:table-cell">{g.note ?? "—"}</td>
                  <td className="px-4 py-3 text-charcoal/60 hidden lg:table-cell">
                    {new Date(g.created_at).toLocaleDateString("en-CA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(g.user_id)}
                      disabled={revoking === g.user_id}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      {revoking === g.user_id ? "…" : "Revoke"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
