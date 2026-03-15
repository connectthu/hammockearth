import { Module } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";
import { RegistrationsModule } from "../registrations/registrations.module";
import { EventsModule } from "../events/events.module";
import { CalendarModule } from "../calendar/calendar.module";

@Module({
  imports: [RegistrationsModule, EventsModule, CalendarModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
