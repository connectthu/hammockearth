import { Module } from "@nestjs/common";
import { SupabaseModule } from "../supabase/supabase.module";
import { BookingController } from "./booking.controller";
import { BookingService } from "./booking.service";
import { GoogleCalendarService } from "./google-calendar.service";
import { ZoomService } from "./zoom.service";

@Module({
  imports: [SupabaseModule],
  controllers: [BookingController],
  providers: [BookingService, GoogleCalendarService, ZoomService],
})
export class BookingModule {}
