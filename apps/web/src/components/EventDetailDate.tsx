"use client";

import { useEffect, useState } from "react";

interface EventDetailDateProps {
  startAt: string;
  endAt: string | null;
}

export function EventDetailDate({ startAt, endAt }: EventDetailDateProps) {
  const [parts, setParts] = useState<{
    monthAbbr: string;
    day: string;
    fullDate: string;
    time: string;
  } | null>(null);

  useEffect(() => {
    const start = new Date(startAt);
    const end = endAt ? new Date(endAt) : null;

    const monthAbbr = start
      .toLocaleDateString(undefined, { month: "short" })
      .toUpperCase();
    const day = String(start.getDate());
    const fullDate = start.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const startTime = start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    const endTime = end
      ? end.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })
      : null;

    setParts({ monthAbbr, day, fullDate, time: endTime ? `${startTime} – ${endTime}` : startTime });
  }, [startAt, endAt]);

  return (
    <div className="flex items-center gap-4 py-5 border-b border-linen">
      {/* Calendar badge */}
      <div className="w-14 h-14 flex-shrink-0 rounded-xl border border-linen bg-linen overflow-hidden flex flex-col items-center justify-center shadow-sm">
        <span className="text-[10px] font-bold text-clay uppercase tracking-wide leading-none mb-0.5">
          {parts?.monthAbbr ?? "–"}
        </span>
        <span className="text-[22px] font-bold text-soil leading-none">
          {parts?.day ?? "–"}
        </span>
      </div>
      <div>
        <p className="font-semibold text-soil">{parts?.fullDate ?? "\u00a0"}</p>
        <p className="text-sm text-charcoal/55 mt-0.5">{parts?.time ?? "\u00a0"}</p>
      </div>
    </div>
  );
}
