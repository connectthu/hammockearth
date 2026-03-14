import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventsModule } from "./events/events.module";
import { FacilitatorModule } from "./facilitator/facilitator.module";
import { WaitlistModule } from "./waitlist/waitlist.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { EmailModule } from "./email/email.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    EmailModule,
    EventsModule,
    FacilitatorModule,
    WaitlistModule,
  ],
})
export class AppModule {}
