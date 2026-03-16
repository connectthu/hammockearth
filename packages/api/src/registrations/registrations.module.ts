import { Module } from "@nestjs/common";
import { RegistrationsController } from "./registrations.controller";
import { RegistrationsService } from "./registrations.service";
import { EventsModule } from "../events/events.module";
import { DiscountCodesModule } from "../discount-codes/discount-codes.module";
import { SeriesModule } from "../series/series.module";

@Module({
  imports: [EventsModule, DiscountCodesModule, SeriesModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
