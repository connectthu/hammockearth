import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StripeModule } from "./stripe/stripe.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { EmailModule } from "./email/email.module";
import { EventsModule } from "./events/events.module";
import { FacilitatorModule } from "./facilitator/facilitator.module";
import { WaitlistModule } from "./waitlist/waitlist.module";
import { DiscountCodesModule } from "./discount-codes/discount-codes.module";
import { CalendarModule } from "./calendar/calendar.module";
import { RegistrationsModule } from "./registrations/registrations.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { UploadModule } from "./upload/upload.module";
import { SeriesModule } from "./series/series.module";
import { MembershipsModule } from "./memberships/memberships.module";
import { CommunicationsModule } from "./communications/communications.module";
import { ContentLibraryModule } from "./content-library/content-library.module";
import { CommunityModule } from "./community/community.module";
import { BookingModule } from "./booking/booking.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    EmailModule,
    StripeModule,
    EventsModule,
    SeriesModule,
    FacilitatorModule,
    WaitlistModule,
    DiscountCodesModule,
    CalendarModule,
    RegistrationsModule,
    WebhooksModule,
    UploadModule,
    MembershipsModule,
    CommunicationsModule,
    ContentLibraryModule,
    CommunityModule,
    BookingModule,
  ],
})
export class AppModule {}
