import { Module } from "@nestjs/common";
import { RegistrationsController } from "./registrations.controller";
import { RegistrationsService } from "./registrations.service";
import { EventsModule } from "../events/events.module";
import { DiscountCodesModule } from "../discount-codes/discount-codes.module";

@Module({
  imports: [EventsModule, DiscountCodesModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
