import { Controller, Get, Param, Res, NotFoundException } from "@nestjs/common";
import { Response } from "express";
import { CalendarService } from "./calendar.service";
import { EventsService } from "../events/events.service";

@Controller("events")
export class CalendarController {
  constructor(
    private calendarService: CalendarService,
    private eventsService: EventsService
  ) {}

  @Get(":slug/calendar.ics")
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
}
