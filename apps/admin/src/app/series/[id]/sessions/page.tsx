"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import { DateTimePicker } from "@/components/DateTimePicker";
import { torontoNaiveToUTC, utcToTorontoNaive } from "@/lib/dateUtils";
import { VideoModal } from "./VideoModal";

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

type Video = {
  id: string;
  title: string;
  video_type: string;
  duration_minutes: number | null;
  display_order: number;
  is_published: boolean;
  bunny_url: string;
};

const VIDEO_TYPE_BADGE: Record<string, string> = {
  main_recording: "bg-clay/10 text-clay",
  meditation: "bg-[#6B7C5C]/10 text-[#6B7C5C]",
  bonus: "bg-sky-100 text-sky-700",
  tutorial: "bg-sky-100 text-sky-700",
  supplementary: "bg-linen text-charcoal/70",
};

const VIDEO_TYPE_LABEL: Record<string, string> = {
  main_recording: "Main",
  meditation: "Meditation",
  bonus: "Bonus",
  tutorial: "Tutorial",
  supplementary: "Supplementary",
};

function formatDatetimeLocal(iso: string) {
  return utcToTorontoNaive(iso);
}

export default function ManageSessionsPage() {
  const params = useParams();
  const id = params.id as string;

  const [series, setSeries] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Session>>>({});

  // Videos state: sessionId → Video[]
  const [videosBySession, setVideosBySession] = useState<Record<string, Video[]>>({});
  const [videosLoading, setVideosLoading] = useState<Record<string, boolean>>({});
  const [showVideoModal, setShowVideoModal] = useState<string | null>(null); // sessionId
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  // Drag state
  const dragVideoId = useRef<string | null>(null);
  const dragSessionId = useRef<string | null>(null);

  useEffect(() => {
    apiGet<any>(`/series?admin=true`).then((list: any[]) => {
      const found = list.find((s: any) => s.id === id);
      setSeries(found ?? null);
    });

    apiGet<any>(`/series?admin=true`).then((list: any[]) => {
      const found = list.find((s: any) => s.id === id);
      if (found) {
        apiGet<any>(`/series/${found.slug}`).then((detail: any) => {
          const loadedSessions: Session[] = detail.sessions ?? [];
          setSessions(loadedSessions);
          setLoading(false);
          // Fetch videos for each session
          loadedSessions.forEach((s) => fetchVideos(s.id));
        });
      } else {
        setLoading(false);
      }
    });
  }, [id]);

  function fetchVideos(sessionId: string) {
    setVideosLoading((prev) => ({ ...prev, [sessionId]: true }));
    apiGet<Video[]>(`/series/${id}/sessions/${sessionId}/videos`)
      .then((videos) => {
        setVideosBySession((prev) => ({ ...prev, [sessionId]: videos }));
      })
      .catch(() => {})
      .finally(() => setVideosLoading((prev) => ({ ...prev, [sessionId]: false })));
  }

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
      if (edit.start_at !== undefined) payload.startAt = torontoNaiveToUTC(edit.start_at);
      if (edit.end_at !== undefined) payload.endAt = torontoNaiveToUTC(edit.end_at);
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

  async function togglePublish(sessionId: string, video: Video) {
    const updated = await apiPatch<Video>(
      `/series/${id}/sessions/${sessionId}/videos/${video.id}`,
      { isPublished: !video.is_published }
    );
    setVideosBySession((prev) => ({
      ...prev,
      [sessionId]: (prev[sessionId] ?? []).map((v) => (v.id === video.id ? updated : v)),
    }));
  }

  async function deleteVideo(sessionId: string, video: Video) {
    if (!confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    await apiDelete(`/series/${id}/sessions/${sessionId}/videos/${video.id}`);
    setVideosBySession((prev) => ({
      ...prev,
      [sessionId]: (prev[sessionId] ?? []).filter((v) => v.id !== video.id),
    }));
  }

  function onDragStart(videoId: string, sessionId: string) {
    dragVideoId.current = videoId;
    dragSessionId.current = sessionId;
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function onDrop(targetVideoId: string, targetSessionId: string) {
    if (!dragVideoId.current || dragSessionId.current !== targetSessionId) return;
    const videos = [...(videosBySession[targetSessionId] ?? [])];
    const fromIdx = videos.findIndex((v) => v.id === dragVideoId.current);
    const toIdx = videos.findIndex((v) => v.id === targetVideoId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    const [moved] = videos.splice(fromIdx, 1);
    videos.splice(toIdx, 0, moved);
    const reordered = videos.map((v, i) => ({ ...v, display_order: i }));
    setVideosBySession((prev) => ({ ...prev, [targetSessionId]: reordered }));

    await Promise.all(
      reordered.map((v) =>
        apiPatch(`/series/${id}/sessions/${targetSessionId}/videos/${v.id}`, {
          displayOrder: v.display_order,
        })
      )
    );
    dragVideoId.current = null;
    dragSessionId.current = null;
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
        <div className="flex items-center gap-4 mb-6">
          <a href="/series" className="text-sm text-charcoal/50 hover:text-charcoal">
            ← Series
          </a>
          <h1 className="font-serif text-2xl text-soil">
            {series?.title ?? ""}
          </h1>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 mb-8 border-b border-linen">
          <span className="px-4 py-2 text-sm font-medium text-clay border-b-2 border-clay">
            Sessions
          </span>
          <a
            href={`/series/${id}/access-grants`}
            className="px-4 py-2 text-sm font-medium text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Access Grants
          </a>
        </div>

        <div className="space-y-6">
          {sessions.map((session) => {
            const edit = edits[session.id] ?? {};
            const isDirty = Object.keys(edit).length > 0;
            const videos = videosBySession[session.id] ?? [];

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

                {/* Videos section */}
                <div className="mt-6 border-t border-linen pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-charcoal/70">Recordings</h3>
                    <button
                      onClick={() => setShowVideoModal(session.id)}
                      className="text-xs font-medium text-clay hover:underline"
                    >
                      + Add Video
                    </button>
                  </div>

                  {videosLoading[session.id] ? (
                    <p className="text-xs text-charcoal/40">Loading videos...</p>
                  ) : videos.length === 0 ? (
                    <p className="text-xs text-charcoal/40 italic">No videos yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {videos.map((video) => (
                        <div
                          key={video.id}
                          draggable
                          onDragStart={() => onDragStart(video.id, session.id)}
                          onDragOver={onDragOver}
                          onDrop={() => onDrop(video.id, session.id)}
                          className="flex items-center gap-3 bg-linen/50 rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing"
                        >
                          {/* Drag handle */}
                          <span className="text-charcoal/30 select-none">⠿</span>

                          {/* Type badge */}
                          <span
                            className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${VIDEO_TYPE_BADGE[video.video_type] ?? "bg-linen text-charcoal/60"}`}
                          >
                            {VIDEO_TYPE_LABEL[video.video_type] ?? video.video_type}
                          </span>

                          {/* Title */}
                          <span className="flex-1 text-sm text-soil truncate">{video.title}</span>

                          {/* Duration */}
                          {video.duration_minutes && (
                            <span className="text-xs text-charcoal/40">{video.duration_minutes}m</span>
                          )}

                          {/* Publish toggle */}
                          <button
                            onClick={() => togglePublish(session.id, video)}
                            className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                              video.is_published
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-linen text-charcoal/50 hover:bg-clay/10 hover:text-clay"
                            }`}
                          >
                            {video.is_published ? "Published" : "Draft"}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => deleteVideo(session.id, video)}
                            className="flex-shrink-0 text-charcoal/30 hover:text-red-500 transition-colors text-sm"
                            title="Delete video"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Video modal */}
      {showVideoModal && (
        <VideoModal
          seriesId={id}
          sessionId={showVideoModal}
          onSaved={(video) => {
            setVideosBySession((prev) => ({
              ...prev,
              [showVideoModal]: [...(prev[showVideoModal] ?? []), video],
            }));
          }}
          onClose={() => setShowVideoModal(null)}
        />
      )}
    </AdminShell>
  );
}
