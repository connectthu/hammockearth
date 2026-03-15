import { Module } from "@nestjs/common";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [EventsModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
