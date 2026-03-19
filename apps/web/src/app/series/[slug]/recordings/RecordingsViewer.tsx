"use client";

import { useState } from "react";

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

const TYPE_ORDER = ["main_recording", "meditation", "bonus", "tutorial", "supplementary"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "long",
    day: "numeric",
    timeZone: "America/Toronto",
  });
}

interface Props {
  series: any;
  sessions: any[];
}

export default function RecordingsViewer({ series, sessions }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(sessions.map((s) => [s.id, true]))
  );
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-4">
      {sessions.map((session: any) => {
        const videos: any[] = session.session_videos ?? [];
        const isOpen = expanded[session.id] !== false;

        const grouped: Record<string, any[]> = {};
        for (const v of videos) {
          if (!grouped[v.video_type]) grouped[v.video_type] = [];
          grouped[v.video_type].push(v);
        }

        return (
          <div key={session.id} className="bg-white rounded-2xl border border-linen overflow-hidden">
            <button
              onClick={() => toggle(session.id)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-linen/30 transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-[#7BA7BC]/10 text-[#5a8da3] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {session.session_number}
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-soil">
                  {session.title ?? `Week ${session.session_number}`}
                </h2>
                <p className="text-xs text-charcoal/40 mt-0.5">
                  {formatDate(session.start_at)}
                </p>
              </div>
              {videos.length > 0 && (
                <span className="text-xs bg-clay/10 text-clay px-2.5 py-1 rounded-full">
                  {videos.length} video{videos.length !== 1 ? "s" : ""}
                </span>
              )}
              <span
                className="text-charcoal/40 text-lg transition-transform inline-block"
                style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
              >
                ⌄
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-linen px-5 py-4">
                {videos.length === 0 ? (
                  <p className="text-sm text-charcoal/40 italic">
                    No recording for this session yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {TYPE_ORDER.filter((type) => grouped[type]?.length > 0).map((type) => (
                      <div key={type}>
                        <p className="text-xs font-semibold text-charcoal/50 uppercase tracking-wide mb-2">
                          {VIDEO_TYPE_EMOJI[type]} {VIDEO_TYPE_LABEL[type]}
                        </p>
                        <div className="space-y-2">
                          {grouped[type].map((video: any) => (
                            <div key={video.id}>
                              <button
                                onClick={() =>
                                  setPlayingVideoId(
                                    playingVideoId === video.id ? null : video.id
                                  )
                                }
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-linen/50 hover:bg-linen transition-colors group text-left"
                              >
                                <span className="text-clay group-hover:scale-110 transition-transform flex-shrink-0">
                                  ▶
                                </span>
                                <span className="flex-1 text-sm font-medium text-soil">
                                  {video.title}
                                </span>
                                {video.duration_minutes && (
                                  <span className="text-xs text-charcoal/40 flex-shrink-0">
                                    {video.duration_minutes}m
                                  </span>
                                )}
                                {playingVideoId === video.id && (
                                  <span className="text-xs text-clay flex-shrink-0">Hide ▲</span>
                                )}
                              </button>
                              {playingVideoId === video.id && (
                                <div
                                  className="mt-2 rounded-xl overflow-hidden bg-black"
                                  style={{ aspectRatio: "16/9" }}
                                >
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
    </div>
  );
}
