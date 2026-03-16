import { Controller, Get, Param, Res, NotFoundException } from "@nestjs/common";
import { Response } from "express";
import { CalendarService } from "./calendar.service";
import { EventsService } from "../events/events.service";
import { SeriesService } from "../series/series.service";

@Controller()
export class CalendarController {
  constructor(
    private calendarService: CalendarService,
    private eventsService: EventsService,
    private seriesService: SeriesService
  ) {}

  @Get("events/:slug/calendar.ics")
  async getIcs(@Param("slug") slug: string, @Res() res: Response) {
    let event: Awaited<ReturnType<typeof this.eventsService.findBySlug>>;
    try {
      event = await this.eventsService.findBySlug(slug);
    } catch {
      throw new NotFoundException("Event not found");
    }

    const ics = this.calendarService.generateIcs(event);

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${slug}.ics"`
    );
    res.send(ics);
  }

  @Get("series/:slug/calendar.ics")
  async getSeriesIcs(@Param("slug") slug: string, @Res() res: Response) {
    let seriesWithSessions: Awaited<ReturnType<typeof this.seriesService.findBySlug>>;
    try {
      seriesWithSessions = await this.seriesService.findBySlug(slug);
    } catch {
      throw new NotFoundException("Series not found");
    }

    const ics = this.calendarService.generateSeriesIcs(
      seriesWithSessions,
      seriesWithSessions.sessions
    );

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${slug}.ics"`
    );
    res.send(ics);
  }
}
