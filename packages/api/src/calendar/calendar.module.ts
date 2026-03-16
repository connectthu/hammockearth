import { Module } from "@nestjs/common";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";
import { EventsModule } from "../events/events.module";
import { SeriesModule } from "../series/series.module";

@Module({
  imports: [EventsModule, SeriesModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
