"use client";

const API_URL =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth")
    : "https://api.hammock.earth";

interface CalendarExportButtonProps {
  event: {
    slug: string;
    title: string;
    start_at: string;
    end_at: string | null;
    location: string;
    description?: string | null;
  };
}

function toGCalDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0] + "Z";
}

export function CalendarExportButton({ event }: CalendarExportButtonProps) {
  const start = toGCalDate(event.start_at);
  const end = event.end_at
    ? toGCalDate(event.end_at)
    : toGCalDate(
        new Date(
          new Date(event.start_at).getTime() + 2 * 60 * 60 * 1000
        ).toISOString()
      );

  const gcalUrl = new URL(
    "https://calendar.google.com/calendar/render"
  );
  gcalUrl.searchParams.set("action", "TEMPLATE");
  gcalUrl.searchParams.set("text", event.title);
  gcalUrl.searchParams.set("dates", `${start}/${end}`);
  gcalUrl.searchParams.set("location", event.location);
  if (event.description) {
    gcalUrl.searchParams.set("details", event.description);
  }

  return (
    <div className="flex gap-2">
      <a
        href={`${API_URL}/events/${event.slug}/calendar.ics`}
        download
        className="flex-1 text-center text-xs font-medium py-2 px-3 rounded-full border border-moss/30 text-moss hover:bg-moss/10 transition-colors"
      >
        Download .ics
      </a>
      <a
        href={gcalUrl.toString()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 text-center text-xs font-medium py-2 px-3 rounded-full border border-moss/30 text-moss hover:bg-moss/10 transition-colors"
      >
        Add to Google
      </a>
    </div>
  );
}
