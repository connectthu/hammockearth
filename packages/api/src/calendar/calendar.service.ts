import { Injectable } from "@nestjs/common";
import type { Event, EventSeries, EventSeriesSession } from "@hammock/database";

@Injectable()
export class CalendarService {
  generateIcs(event: Event): string {
    const now = this.formatDate(new Date());
    const start = this.formatDate(new Date(event.start_at));
    const end = event.end_at
      ? this.formatDate(new Date(event.end_at))
      : this.formatDate(new Date(new Date(event.start_at).getTime() + 2 * 60 * 60 * 1000));

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Hammock Earth//hammock.earth//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${event.id}@hammock.earth`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${this.escapeText(event.title)}`,
      `LOCATION:${this.escapeText(event.location)}`,
    ];

    if (event.description) {
      lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
    }

    lines.push("END:VEVENT", "END:VCALENDAR");

    return lines.join("\r\n") + "\r\n";
  }

  generateSeriesIcs(series: EventSeries, sessions: EventSeriesSession[]): string {
    const now = this.formatDate(new Date());
    const events = sessions.map((session) => {
      const start = this.formatDate(new Date(session.start_at));
      const end = this.formatDate(new Date(session.end_at));
      const location = session.meeting_url ?? series.location ?? "";
      return [
        "BEGIN:VEVENT",
        `UID:${series.id}-${session.id}@hammock.earth`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${this.escapeText(`${series.title} — Week ${session.session_number}`)}`,
        `LOCATION:${this.escapeText(location)}`,
        "END:VEVENT",
      ].join("\r\n");
    });

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Hammock Earth//hammock.earth//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n";
  }

  private formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  private escapeText(text: string): string {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }
}
