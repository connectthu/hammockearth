"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { apiGet, apiPatch } from "@/lib/api";
import { DateTimePicker } from "@/components/DateTimePicker";

type Session = {
  id: string;
  session_number: number;
  title: string | null;
  start_at: string;
  end_at: string;
  meeting_url: string | null;
  location: string | null;
  status: string;
};

function formatDatetimeLocal(iso: string) {
  return new Date(iso).toISOString().slice(0, 16);
}

export default function ManageSessionsPage() {
  const params = useParams();
  const id = params.id as string;

  const [series, setSeries] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Session>>>({});

  useEffect(() => {
    apiGet<any>(`/series?admin=true`).then((list: any[]) => {
      const found = list.find((s: any) => s.id === id);
      setSeries(found ?? null);
    });

    // Fetch sessions via series slug workaround — we'll load from the series detail
    apiGet<any>(`/series?admin=true`).then((list: any[]) => {
      const found = list.find((s: any) => s.id === id);
      if (found) {
        apiGet<any>(`/series/${found.slug}`).then((detail: any) => {
          setSessions(detail.sessions ?? []);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [id]);

  function setEdit(sessionId: string, field: keyof Session, value: string) {
    setEdits((prev) => ({
      ...prev,
      [sessionId]: { ...prev[sessionId], [field]: value },
    }));
  }

  async function saveSession(session: Session) {
    const edit = edits[session.id] ?? {};
    if (Object.keys(edit).length === 0) return;

    setSaving(session.id);
    try {
      const payload: Record<string, unknown> = {};
      if (edit.title !== undefined) payload.title = edit.title;
      if (edit.meeting_url !== undefined) payload.meetingUrl = edit.meeting_url;
      if (edit.location !== undefined) payload.location = edit.location;
      if (edit.start_at !== undefined) payload.startAt = new Date(edit.start_at).toISOString();
      if (edit.end_at !== undefined) payload.endAt = new Date(edit.end_at).toISOString();
      if (edit.status !== undefined) payload.status = edit.status;

      await apiPatch(`/series/${id}/sessions/${session.id}`, payload);

      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, ...edit } : s))
      );
      setEdits((prev) => {
        const next = { ...prev };
        delete next[session.id];
        return next;
      });
    } catch {
      alert("Failed to save session.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="text-center py-20 text-charcoal/50">Loading...</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <a href="/series" className="text-sm text-charcoal/50 hover:text-charcoal">
            ← Series
          </a>
          <h1 className="font-serif text-2xl text-soil">
            Sessions — {series?.title ?? ""}
          </h1>
        </div>

        <div className="space-y-4">
          {sessions.map((session) => {
            const edit = edits[session.id] ?? {};
            const isDirty = Object.keys(edit).length > 0;

            return (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-linen p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 rounded-full bg-[#7BA7BC]/10 text-[#5a8da3] flex items-center justify-center text-sm font-semibold">
                    {session.session_number}
                  </span>
                  <h2 className="font-medium text-soil">Week {session.session_number}</h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-charcoal/60 mb-1">
                      Session title (optional)
                    </label>
                    <input
                      type="text"
                      value={edit.title ?? session.title ?? ""}
                      onChange={(e) => setEdit(session.id, "title", e.target.value)}
                      placeholder={`Week ${session.session_number}`}
                      className="w-full px-3 py-2 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-charcoal/60 mb-1">
                      Meeting URL
                    </label>
                    <input
                      type="url"
                      value={edit.meeting_url ?? session.meeting_url ?? ""}
                      onChange={(e) => setEdit(session.id, "meeting_url", e.target.value)}
                      placeholder="https://zoom.us/j/..."
                      className="w-full px-3 py-2 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-charcoal/60 mb-1">
                      Start
                    </label>
                    <DateTimePicker
                      value={edit.start_at ?? formatDatetimeLocal(session.start_at)}
                      onChange={(v) => setEdit(session.id, "start_at", v)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-charcoal/60 mb-1">
                      End
                    </label>
                    <DateTimePicker
                      value={edit.end_at ?? formatDatetimeLocal(session.end_at)}
                      onChange={(v) => setEdit(session.id, "end_at", v)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-charcoal/60 mb-1">
                      Status
                    </label>
                    <select
                      value={edit.status ?? session.status}
                      onChange={(e) => setEdit(session.id, "status", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {isDirty && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => saveSession(session)}
                      disabled={saving === session.id}
                      className="bg-clay text-white text-sm font-medium px-6 py-2 rounded-full hover:bg-clay/90 disabled:opacity-50 transition-colors"
                    >
                      {saving === session.id ? "Saving..." : "Save session"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
