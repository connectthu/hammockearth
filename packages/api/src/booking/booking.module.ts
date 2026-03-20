import { Module } from "@nestjs/common";
import { SupabaseModule } from "../supabase/supabase.module";
import { BookingController } from "./booking.controller";
import { BookingService } from "./booking.service";

@Module({
  imports: [SupabaseModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
