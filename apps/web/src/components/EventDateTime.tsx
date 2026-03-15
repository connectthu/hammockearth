"use client";

import { useEffect, useState } from "react";

interface EventDateTimeProps {
  startAt: string;
  endAt: string | null;
}

export function EventDateTime({ startAt, endAt }: EventDateTimeProps) {
  const [formatted, setFormatted] = useState<{
    date: string;
    time: string;
  } | null>(null);

  useEffect(() => {
    const start = new Date(startAt);
    const end = endAt ? new Date(endAt) : null;

    const date = start.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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

    setFormatted({
      date,
      time: endTime ? `${startTime} – ${endTime}` : startTime,
    });
  }, [startAt, endAt]);

  if (!formatted) {
    // SSR / pre-mount placeholder — same height to avoid layout shift
    return (
      <>
        <p className="font-medium text-soil text-sm">&nbsp;</p>
        <p className="text-charcoal/60 text-sm">&nbsp;</p>
      </>
    );
  }

  return (
    <>
      <p className="font-medium text-soil text-sm">{formatted.date}</p>
      <p className="text-charcoal/60 text-sm">{formatted.time}</p>
    </>
  );
}
