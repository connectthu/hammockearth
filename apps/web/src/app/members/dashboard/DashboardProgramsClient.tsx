"use client";

import { useState } from "react";
import Link from "next/link";

const VIDEO_TYPE_EMOJI: Record<string, string> = {
  main_recording: "🎥",
  meditation: "🧘",
  bonus: "✨",
  tutorial: "📖",
  supplementary: "🔖",
};

const VIDEO_TYPE_LABEL: Record<string, string> = {
  main_recording: "Main Recording",
  meditation: "Meditation",
  bonus: "Bonus",
  tutorial: "Tutorial",
  supplementary: "Supplementary",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "America/Toronto",
  });
}

interface Props {
  myPrograms: any[];
}

export default function DashboardProgramsClient({ myPrograms }: Props) {
  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>(
    Object.fromEntries(myPrograms.map((s) => [s.id, true]))
  );
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  if (myPrograms.length === 0) return null;

  function toggleSeries(id: string) {
    setExpandedSeries((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSession(id: string) {
    setExpandedSessions((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <h2 className="font-serif text-xl text-soil mb-4">My Programs</h2>
      <div className="space-y-4">
        {myPrograms.map((series: any) => {
          const sessions = [...(series.event_series_sessions ?? [])].sort(
            (a: any, b: any) => a.session_number - b.session_number
          );
          const isSeriesOpen = expandedSeries[series.id] !== false;

          return (
            <div key={series.id} className="bg-white rounded-2xl border border-linen overflow-hidden">
              {/* Series header */}
              <button
                onClick={() => toggleSeries(series.id)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-linen/30 transition-colors"
              >
                {series.cover_image_url ? (
                  <img
                    src={series.cover_image_url}
                    alt={series.title}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-linen flex items-center justify-center flex-shrink-0 text-2xl">
                    🌿
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-soil leading-snug">{series.title}</h3>
                  <p className="text-xs text-charcoal/50 mt-0.5">
                    {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-charcoal/40 text-lg transition-transform" style={{ transform: isSeriesOpen ? "rotate(180deg)" : undefined }}>
                  ⌄
                </span>
              </button>

              {isSeriesOpen && (
                <div className="border-t border-linen divide-y divide-linen/60">
                  {sessions.map((session: any) => {
                    const publishedVideos = (session.session_videos ?? []).filter((v: any) => v.is_published);
                    const now = new Date();
                    const sessionStart = new Date(session.start_at);
                    const isPast = sessionStart < now;
                    const isSessionOpen = expandedSessions[session.id] !== false;

                    // Group videos by type
                    const grouped: Record<string, any[]> = {};
                    for (const v of publishedVideos) {
                      if (!grouped[v.video_type]) grouped[v.video_type] = [];
                      grouped[v.video_type].push(v);
                    }
                    const typeOrder = ["main_recording", "meditation", "bonus", "tutorial", "supplementary"];

                    return (
                      <div key={session.id}>
                        <button
                          onClick={() => toggleSession(session.id)}
                          className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-linen/20 transition-colors"
                        >
                          <span className="w-6 h-6 rounded-full bg-[#7BA7BC]/10 text-[#5a8da3] flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {session.session_number}
                          </span>
                          <span className="flex-1 text-sm font-medium text-soil">
                            {session.title ?? `Week ${session.session_number}`}
                          </span>
                          <span className="text-xs text-charcoal/40">{formatDate(session.start_at)}</span>
                          {publishedVideos.length > 0 && (
                            <span className="text-xs bg-clay/10 text-clay px-2 py-0.5 rounded-full">
                              {publishedVideos.length} video{publishedVideos.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          <span className="text-charcoal/30 text-sm" style={{ transform: isSessionOpen ? "rotate(180deg)" : undefined, display: "inline-block" }}>
                            ⌄
                          </span>
                        </button>

                        {isSessionOpen && (
                          <div className="px-5 pb-4">
                            {publishedVideos.length === 0 ? (
                              <p className="text-xs text-charcoal/40 italic py-2">
                                {isPast ? "Recording coming soon" : `Coming ${formatDate(session.start_at)}`}
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {typeOrder
                                  .filter((type) => grouped[type]?.length > 0)
                                  .map((type) => (
                                    <div key={type}>
                                      <p className="text-xs font-medium text-charcoal/50 mb-1.5">
                                        {VIDEO_TYPE_EMOJI[type]} {VIDEO_TYPE_LABEL[type]}
                                      </p>
                                      <div className="space-y-1.5">
                                        {grouped[type].map((video: any) => (
                                          <div key={video.id}>
                                            <button
                                              onClick={() =>
                                                setPlayingVideoId(
                                                  playingVideoId === video.id ? null : video.id
                                                )
                                              }
                                              className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-xl bg-linen/50 hover:bg-linen transition-colors group"
                                            >
                                              <span className="text-clay group-hover:scale-110 transition-transform">▶</span>
                                              <span className="flex-1 text-sm text-soil">{video.title}</span>
                                              {video.duration_minutes && (
                                                <span className="text-xs text-charcoal/40">{video.duration_minutes}m</span>
                                              )}
                                            </button>
                                            {playingVideoId === video.id && (
                                              <div className="mt-2 rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
                                                <iframe
                                                  src={video.bunny_url}
                                                  className="w-full h-full"
                                                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                                                  allowFullScreen
                                                />
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="px-5 py-3 bg-linen/20">
                    <Link
                      href={`/series/${series.slug}/recordings`}
                      className="text-sm text-clay font-medium hover:underline"
                    >
                      View all recordings →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
