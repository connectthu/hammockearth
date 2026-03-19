"use client";

import ReactPlayer from "react-player";

interface ExternalContentProps {
  url: string;
  summary?: string | null;
}

export function ExternalContent({ url, summary }: ExternalContentProps) {
  if (ReactPlayer.canPlay(url)) {
    return (
      <div className="rounded-xl overflow-hidden mb-10 aspect-video bg-soil">
        <ReactPlayer url={url} controls width="100%" height="100%" />
      </div>
    );
  }

  let hostname = url;
  try {
    hostname = new URL(url).hostname;
  } catch {}

  return (
    <div className="mb-10 p-6 rounded-2xl border border-linen bg-white flex items-center justify-between gap-4">
      <div>
        <p className="text-xs text-soil/40 mb-1">{hostname}</p>
        {summary && <p className="text-sm text-soil/70">{summary}</p>}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-2 bg-clay text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-clay/90 transition-colors"
      >
        Visit link ↗
      </a>
    </div>
  );
}
