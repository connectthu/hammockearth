import { Test } from "@nestjs/testing";
import { CalendarService } from "./calendar.service";

const mockEvent = {
  title: "Mushroom Log Inoculation Workshop",
  slug: "mushroom-workshop",
  description: "Learn to inoculate mushroom logs.",
  location: "Hammock Hills, Hillsdale, ON",
  start_at: "2026-06-01T10:00:00Z",
  end_at: "2026-06-01T14:00:00Z",
} as any;

describe("CalendarService", () => {
  let service: CalendarService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CalendarService],
    }).compile();
    service = module.get(CalendarService);
  });

  it("generates a valid ICS string", () => {
    const ics = service.generateIcs(mockEvent);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });

  it("includes event title in SUMMARY", () => {
    const ics = service.generateIcs(mockEvent);
    expect(ics).toContain("SUMMARY:Mushroom Log Inoculation Workshop");
  });

  it("includes location in LOCATION", () => {
    const ics = service.generateIcs(mockEvent);
    expect(ics).toContain("LOCATION:Hammock Hills");
  });

  it("uses CRLF line endings (RFC 5545)", () => {
    const ics = service.generateIcs(mockEvent);
    expect(ics).toMatch(/\r\n/);
    expect(ics).not.toMatch(/(?<!\r)\n/);
  });

  it("includes DTSTART and DTEND", () => {
    const ics = service.generateIcs(mockEvent);
    expect(ics).toMatch(/DTSTART:/);
    expect(ics).toMatch(/DTEND:/);
  });

  it("handles missing end_at by defaulting to start_at", () => {
    const ics = service.generateIcs({ ...mockEvent, end_at: null });
    expect(ics).toContain("BEGIN:VEVENT");
  });
});
