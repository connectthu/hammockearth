"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiGet, apiDelete } from "@/lib/api";

interface Profile {
  full_name: string | null;
  username: string | null;
}

interface Shoutout {
  id: string;
  body: string;
  heart_count: number;
  created_at: string;
  user_id: string;
  profiles: Profile | null;
}

interface Ask {
  id: string;
  category: string;
  title: string;
  body: string;
  supported_count: number;
  status: "open" | "closed";
  created_at: string;
  user_id: string;
  profiles: Profile | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CommunityAdminPage() {
  const [tab, setTab] = useState<"shoutouts" | "asks">("shoutouts");
  const [shoutouts, setShoutouts] = useState<Shoutout[]>([]);
  const [asks, setAsks] = useState<Ask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet<Shoutout[]>("/community/admin/shoutouts"),
      apiGet<Ask[]>("/community/admin/asks"),
    ])
      .then(([s, a]) => {
        setShoutouts(s);
        setAsks(a);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDeleteShoutout(id: string, preview: string) {
    if (!confirm(`Delete shoutout: "${preview.slice(0, 60)}…"?`)) return;
    try {
      await apiDelete(`/community/admin/shoutouts/${id}`);
      setShoutouts((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message ?? "Delete failed");
    }
  }

  async function handleDeleteAsk(id: string, title: string) {
    if (!confirm(`Delete ask: "${title}"?`)) return;
    try {
      await apiDelete(`/community/admin/asks/${id}`);
      setAsks((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message ?? "Delete failed");
    }
  }

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-soil">Community Board</h1>
        <p className="text-sm text-soil/50 mt-0.5">Moderate shoutouts and asks</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setTab("shoutouts")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "shoutouts" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Shoutouts ({shoutouts.length})
        </button>
        <button
          onClick={() => setTab("asks")}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === "asks" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Asks ({asks.length})
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : tab === "shoutouts" ? (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {shoutouts.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No shoutouts yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-medium">Member</th>
                  <th className="px-5 py-3 text-left font-medium">Body</th>
                  <th className="px-5 py-3 text-left font-medium">Hearts</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {shoutouts.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {s.profiles?.full_name ?? "—"}
                      {s.profiles?.username && (
                        <span className="ml-1 text-gray-400 font-normal">@{s.profiles.username}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600 max-w-xs">
                      <span className="line-clamp-2">{s.body}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{s.heart_count}</td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{formatDate(s.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDeleteShoutout(s.id, s.body)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {asks.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No asks yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-medium">Member</th>
                  <th className="px-5 py-3 text-left font-medium">Category</th>
                  <th className="px-5 py-3 text-left font-medium">Title</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Supporters</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {asks.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {a.profiles?.full_name ?? "—"}
                      {a.profiles?.username && (
                        <span className="ml-1 text-gray-400 font-normal">@{a.profiles.username}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {a.category.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700 max-w-xs">
                      <span className="line-clamp-1">{a.title}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.status === "open"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{a.supported_count}</td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{formatDate(a.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDeleteAsk(a.id, a.title)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </AdminShell>
  );
}
