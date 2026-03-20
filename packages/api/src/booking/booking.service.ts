import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { SupabaseService } from "../supabase/supabase.service";
import { EmailService } from "../email/email.service";
import type { CreateBookingDto } from "./dto/create-booking.dto";

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private supabase: SupabaseService,
    private email: EmailService,
    private config: ConfigService
  ) {}

  // ── Timezone helper (no external deps, uses built-in Intl API) ────────────

  /**
   * Convert a local date + time string in a named timezone to a UTC Date.
   * Uses the Intl API available in Node 18+.
   * e.g. localToUTC("2026-03-25", "09:00", "America/Toronto") → Date(2026-03-25T13:00:00Z)
   */
  private localToUTC(dateStr: string, timeStr: string, timezone: string): Date {
    // naive: treat the input as if it were UTC (a reference point)
    const naive = new Date(`${dateStr}T${timeStr}:00Z`);

    // Find what local time the naive UTC moment represents in the target timezone
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(naive);

    const p: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") p[part.type] = part.value ?? "";
    }

    // Handle the "24:00" edge case (midnight represented as hour 24)
    const hour = p["hour"] === "24" ? "00" : (p["hour"] ?? "00");
    const dayAdj = p["hour"] === "24" ? 1 : 0;

    // Parse the local time back as a UTC moment
    const localAsUTC = new Date(
      `${p["year"]}-${p["month"]}-${p["day"]}T${hour}:${p["minute"] ?? "00"}:${p["second"] ?? "00"}Z`
    );
    if (dayAdj) localAsUTC.setUTCDate(localAsUTC.getUTCDate() + 1);

    // offset = how many ms ahead UTC is relative to local time
    const offsetMs = naive.getTime() - localAsUTC.getTime();
    return new Date(naive.getTime() + offsetMs);
  }

  // ── Public endpoints ──────────────────────────────────────────────────────

  async getProfile(slug: string) {
    const { data: profileData, error } = await this.supabase.client
      .from("bookable_profiles" as any)
      .select("id, slug, headline, subheading, about, avatar_url, buffer_minutes, cancellation_notice_hours")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error || !profileData) throw new NotFoundException("Profile not found");
    const profile = profileData as any;

    const { data: sessionTypesData } = await this.supabase.client
      .from("session_types" as any)
      .select("id, name, description, duration_minutes, location_type, location_detail, price_cents, is_free")
      .eq("profile_id", profile.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    // Fetch day_of_week values so the frontend can highlight available calendar days
    const { data: schedulesData } = await this.supabase.client
      .from("availability_schedules" as any)
      .select("day_of_week")
      .eq("profile_id", profile.id);

    const availabilityDays = [
      ...new Set(((schedulesData ?? []) as any[]).map((s) => s.day_of_week as number)),
    ];

    return {
      profile,
      sessionTypes: (sessionTypesData ?? []) as any[],
      availabilityDays,
    };
  }

  async getAvailability(
    slug: string,
    date: string,
    sessionTypeId: string
  ): Promise<string[]> {
    // Load profile (buffer_minutes)
    const { data: profileData } = await this.supabase.client
      .from("bookable_profiles" as any)
      .select("id, buffer_minutes")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (!profileData) return [];
    const profile = profileData as any;

    // Load session type (duration)
    const { data: sessionTypeData } = await this.supabase.client
      .from("session_types" as any)
      .select("duration_minutes")
      .eq("id", sessionTypeId)
      .eq("profile_id", profile.id)
      .eq("is_active", true)
      .single();

    if (!sessionTypeData) return [];
    const durationMinutes = (sessionTypeData as any).duration_minutes as number;

    // Parse the date and get day_of_week in UTC (dates are stored as YYYY-MM-DD)
    const [year, month, day] = date.split("-").map(Number);
    const dateObj = new Date(Date.UTC(year!, month! - 1, day!));
    const dayOfWeek = dateObj.getUTCDay();

    // Check for a date override
    const { data: overrideData } = await this.supabase.client
      .from("availability_overrides" as any)
      .select("is_unavailable, start_time, end_time")
      .eq("profile_id", profile.id)
      .eq("date", date)
      .maybeSingle();

    const override = overrideData as any;
    if (override?.is_unavailable) return [];

    // Load weekly schedules for this day_of_week
    const { data: schedulesData } = await this.supabase.client
      .from("availability_schedules" as any)
      .select("start_time, end_time, timezone")
      .eq("profile_id", profile.id)
      .eq("day_of_week", dayOfWeek);

    const schedules = (schedulesData ?? []) as any[];

    // Determine effective availability windows for this date
    let windows: Array<{ start: string; end: string; timezone: string }>;

    if (override && !override.is_unavailable && override.start_time && override.end_time) {
      // Override adds custom hours for this date; use the schedule's timezone as fallback
      const tz = schedules[0]?.timezone ?? "America/Toronto";
      windows = [{ start: override.start_time, end: override.end_time, timezone: tz }];
    } else {
      if (schedules.length === 0) return [];
      windows = schedules.map((s) => ({
        start: s.start_time as string,
        end: s.end_time as string,
        timezone: s.timezone as string,
      }));
    }

    // Load confirmed bookings for this day (±2h buffer to catch edge cases)
    const dayStartMs = dateObj.getTime() - 2 * 60 * 60 * 1000;
    const dayEndMs = dateObj.getTime() + 26 * 60 * 60 * 1000;

    const { data: existingBookings } = await this.supabase.client
      .from("bookings" as any)
      .select("start_at, end_at")
      .eq("profile_id", profile.id)
      .eq("status", "confirmed")
      .gte("start_at", new Date(dayStartMs).toISOString())
      .lte("start_at", new Date(dayEndMs).toISOString());

    const bookings = (existingBookings ?? []) as any[];
    const bufferMs = (profile.buffer_minutes as number) * 60 * 1000;
    const durationMs = durationMinutes * 60 * 1000;
    const slotIntervalMs = 30 * 60 * 1000; // generate slots every 30 minutes
    const now = Date.now();

    const slots: string[] = [];

    for (const window of windows) {
      // Strip seconds if present: "09:00:00" → "09:00"
      const startStr = (window.start as string).slice(0, 5);
      const endStr = (window.end as string).slice(0, 5);

      const windowStart = this.localToUTC(date, startStr, window.timezone);
      const windowEnd = this.localToUTC(date, endStr, window.timezone);

      let current = windowStart.getTime();

      while (current + durationMs <= windowEnd.getTime()) {
        const slotEnd = current + durationMs;

        // Skip past slots
        if (slotEnd <= now) {
          current += slotIntervalMs;
          continue;
        }

        // Check conflicts with existing bookings (including buffer on both sides)
        const hasConflict = bookings.some((b) => {
          const bStart = new Date(b.start_at as string).getTime() - bufferMs;
          const bEnd = new Date(b.end_at as string).getTime() + bufferMs;
          return current < bEnd && slotEnd > bStart;
        });

        if (!hasConflict) {
          slots.push(new Date(current).toISOString());
        }

        current += slotIntervalMs;
      }
    }

    return slots;
  }

  async createBooking(slug: string, dto: CreateBookingDto) {
    // Load profile
    const { data: profileData } = await this.supabase.client
      .from("bookable_profiles" as any)
      .select("id, buffer_minutes, headline")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (!profileData) throw new NotFoundException("Profile not found");
    const profile = profileData as any;

    // Load session type
    const { data: sessionTypeData } = await this.supabase.client
      .from("session_types" as any)
      .select("id, name, duration_minutes, location_type, location_detail, price_cents, is_free")
      .eq("id", dto.sessionTypeId)
      .eq("profile_id", profile.id)
      .eq("is_active", true)
      .single();

    if (!sessionTypeData) throw new BadRequestException("Invalid session type");
    const sessionType = sessionTypeData as any;

    const startAt = new Date(dto.startAt);
    if (isNaN(startAt.getTime())) throw new BadRequestException("Invalid startAt");
    const endAt = new Date(startAt.getTime() + (sessionType.duration_minutes as number) * 60 * 1000);
    const bufferMs = (profile.buffer_minutes as number) * 60 * 1000;

    // Verify the slot is still available (race condition guard)
    const { data: conflicts } = await this.supabase.client
      .from("bookings" as any)
      .select("id")
      .eq("profile_id", profile.id)
      .eq("status", "confirmed")
      .gte("start_at", new Date(startAt.getTime() - bufferMs).toISOString())
      .lte("end_at", new Date(endAt.getTime() + bufferMs).toISOString());

    if ((conflicts ?? []).length > 0) {
      throw new BadRequestException("This time slot is no longer available. Please choose another.");
    }

    const cancellationToken = randomBytes(32).toString("hex");

    const { data: booking, error } = await this.supabase.client
      .from("bookings" as any)
      .insert({
        profile_id: profile.id,
        session_type_id: dto.sessionTypeId,
        booker_name: dto.bookerName,
        booker_email: dto.bookerEmail,
        booker_notes: dto.bookerNotes ?? null,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        timezone: dto.timezone,
        location_type: sessionType.location_type,
        zoom_link: null,
        status: "confirmed",
        cancellation_token: cancellationToken,
      })
      .select()
      .single();

    if (error || !booking) {
      this.logger.error("Failed to create booking", error);
      throw new BadRequestException("Failed to create booking");
    }

    const b = booking as any;
    const icsContent = this.generateBookingIcs(b, sessionType);
    const icsBase64 = Buffer.from(icsContent).toString("base64");

    const appUrl = this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? "https://hammock.earth";
    const cancelUrl = `${appUrl}/profile/${slug}/cancel/${cancellationToken}`;

    const startFormatted = startAt.toLocaleString("en-CA", {
      timeZone: dto.timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const locationDisplay =
      sessionType.location_type === "zoom"
        ? "Zoom (link to follow)"
        : sessionType.location_type === "phone"
          ? "Phone call"
          : (sessionType.location_detail as string) ?? "TBD";

    // Confirmation email to booker
    this.email
      .send({
        to: dto.bookerEmail,
        subject: `Your session is confirmed: ${sessionType.name as string}`,
        html: this.wrapEmail(`
          <h2 style="font-family:Georgia,serif;color:#3B2F2F;margin-bottom:8px">Session Confirmed ✓</h2>
          <p style="margin-top:0">Hi ${dto.bookerName},</p>
          <p>Your session has been confirmed. A calendar invite is attached.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
            <tr style="border-bottom:1px solid #F5EFE6">
              <td style="padding:10px 0;font-weight:600;color:#6B7C5C;width:140px">Session</td>
              <td style="padding:10px 0;color:#3B2F2F">${sessionType.name as string}</td>
            </tr>
            <tr style="border-bottom:1px solid #F5EFE6">
              <td style="padding:10px 0;font-weight:600;color:#6B7C5C">Date &amp; Time</td>
              <td style="padding:10px 0;color:#3B2F2F">${startFormatted}</td>
            </tr>
            <tr style="border-bottom:1px solid #F5EFE6">
              <td style="padding:10px 0;font-weight:600;color:#6B7C5C">Duration</td>
              <td style="padding:10px 0;color:#3B2F2F">${sessionType.duration_minutes as number} minutes</td>
            </tr>
            <tr style="border-bottom:1px solid #F5EFE6">
              <td style="padding:10px 0;font-weight:600;color:#6B7C5C">Location</td>
              <td style="padding:10px 0;color:#3B2F2F">${locationDisplay}</td>
            </tr>
            ${dto.bookerNotes ? `<tr><td style="padding:10px 0;font-weight:600;color:#6B7C5C">Your notes</td><td style="padding:10px 0;color:#3B2F2F">${dto.bookerNotes}</td></tr>` : ""}
          </table>
          <p style="margin-top:24px;font-size:13px;color:#6B7C5C">
            Need to cancel? <a href="${cancelUrl}" style="color:#C4845A">Cancel this booking</a>
          </p>
        `),
        attachments: [{ filename: "session.ics", content: icsBase64 }],
      })
      .catch((err: unknown) => this.logger.error("Failed to send booker confirmation email", err));

    // Notification email to host
    const hostEmail = this.config.get<string>("EMAIL_FROM") ?? "hello@hammock.earth";
    this.email
      .send({
        to: hostEmail,
        replyTo: dto.bookerEmail,
        subject: `New booking: ${sessionType.name as string} with ${dto.bookerName}`,
        html: this.wrapEmail(`
          <h2 style="font-family:Georgia,serif;color:#3B2F2F;margin-bottom:8px">New Booking</h2>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
            <tr style="border-bottom:1px solid #F5EFE6">
              <td style="padding:10px 0;font-weight:600;color:#6B7C5C;width:140px">Booker</td>
              <td style="padding:10px 0;color:#3B2F2F">${dto.bookerName} &lt;${dto.bookerEmail}&gt;</td>
            </tr>
            <tr style="border-bottom:1px solid #F5EFE6">
              <td style="padding:10px 0;font-weight:600;color:#6B7C5C">Session</td>
              <td style="padding:10px 0;color:#3B2F2F">${sessionType.name as string}</td>
            </tr>
            <tr style="border-bottom:1px solid #F5EFE6">
              <td style="padding:10px 0;font-weight:600;color:#6B7C5C">Date &amp; Time</td>
              <td style="padding:10px 0;color:#3B2F2F">${startFormatted}</td>
            </tr>
            <tr style="border-bottom:1px solid #F5EFE6">
              <td style="padding:10px 0;font-weight:600;color:#6B7C5C">Duration</td>
              <td style="padding:10px 0;color:#3B2F2F">${sessionType.duration_minutes as number} minutes</td>
            </tr>
            ${dto.bookerNotes ? `<tr><td style="padding:10px 0;font-weight:600;color:#6B7C5C">Notes</td><td style="padding:10px 0;color:#3B2F2F">${dto.bookerNotes}</td></tr>` : ""}
          </table>
        `),
        attachments: [{ filename: "session.ics", content: icsBase64 }],
      })
      .catch((err: unknown) => this.logger.error("Failed to send host notification email", err));

    return {
      id: b.id as string,
      startAt: b.start_at as string,
      endAt: b.end_at as string,
      sessionTypeName: sessionType.name as string,
      durationMinutes: sessionType.duration_minutes as number,
      locationType: sessionType.location_type as string,
      locationDetail: sessionType.location_detail as string | null,
      bookerName: dto.bookerName,
      bookerEmail: dto.bookerEmail,
      timezone: dto.timezone,
      cancellationToken,
    };
  }

  async cancelByToken(token: string) {
    const { data: bookingData } = await this.supabase.client
      .from("bookings" as any)
      .select("id, profile_id, booker_name, booker_email, start_at, timezone, session_types(name)")
      .eq("cancellation_token", token)
      .eq("status", "confirmed")
      .single();

    if (!bookingData) throw new NotFoundException("Booking not found or already cancelled");
    const booking = bookingData as any;

    await this.supabase.client
      .from("bookings" as any)
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", booking.id);

    const startFormatted = new Date(booking.start_at as string).toLocaleString("en-CA", {
      timeZone: booking.timezone as string,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const sessionName = (booking.session_types as any)?.name ?? "Session";

    this.email
      .send({
        to: booking.booker_email as string,
        subject: `Session cancelled: ${sessionName}`,
        html: this.wrapEmail(`
          <h2 style="font-family:Georgia,serif;color:#3B2F2F">Session Cancelled</h2>
          <p>Hi ${booking.booker_name as string},</p>
          <p>Your session has been cancelled.</p>
          <p><strong>${sessionName}</strong> — ${startFormatted}</p>
          <p style="color:#6B7C5C;font-size:14px">If you'd like to rebook, please visit the booking page.</p>
        `),
      })
      .catch((err: unknown) => this.logger.error("Failed to send cancellation email to booker", err));

    const hostEmail = this.config.get<string>("EMAIL_FROM") ?? "hello@hammock.earth";
    this.email
      .send({
        to: hostEmail,
        subject: `Booking cancelled: ${sessionName} with ${booking.booker_name as string}`,
        html: this.wrapEmail(`
          <h2 style="font-family:Georgia,serif;color:#3B2F2F">Booking Cancelled</h2>
          <p>${booking.booker_name as string} (${booking.booker_email as string}) cancelled their session.</p>
          <p><strong>${sessionName}</strong> — ${startFormatted}</p>
        `),
      })
      .catch((err: unknown) => this.logger.error("Failed to send cancellation email to host", err));

    return { cancelled: true };
  }

  // ── Admin endpoints ───────────────────────────────────────────────────────

  async adminListProfiles() {
    const { data } = await this.supabase.client
      .from("bookable_profiles" as any)
      .select("*")
      .order("created_at", { ascending: true });
    return (data ?? []) as any[];
  }

  async adminUpsertProfile(dto: Record<string, unknown>) {
    // If no user_id supplied (admin tool has no user context), auto-assign
    // the first superadmin's profile ID so the FK constraint is satisfied.
    if (!dto["user_id"]) {
      const { data: superadmin } = await this.supabase.client
        .from("profiles" as any)
        .select("id")
        .eq("role", "superadmin")
        .limit(1)
        .single();
      if (superadmin) {
        dto = { ...dto, user_id: (superadmin as any).id };
      }
    }

    if (dto["id"]) {
      const { id, ...rest } = dto;
      const { data, error } = await this.supabase.client
        .from("bookable_profiles" as any)
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as any;
    }
    const { data, error } = await this.supabase.client
      .from("bookable_profiles" as any)
      .insert(dto)
      .select()
      .single();
    if (error) throw error;
    return data as any;
  }

  async adminGetSessionTypes(profileId: string) {
    const { data } = await this.supabase.client
      .from("session_types" as any)
      .select("*")
      .eq("profile_id", profileId)
      .order("display_order", { ascending: true });
    return (data ?? []) as any[];
  }

  async adminUpsertSessionType(profileId: string, dto: Record<string, unknown>) {
    if (dto["id"]) {
      const { id, ...rest } = dto;
      const { data, error } = await this.supabase.client
        .from("session_types" as any)
        .update({ ...rest, profile_id: profileId })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as any;
    }
    const { data, error } = await this.supabase.client
      .from("session_types" as any)
      .insert({ ...dto, profile_id: profileId })
      .select()
      .single();
    if (error) throw error;
    return data as any;
  }

  async adminDeleteSessionType(id: string) {
    const { error } = await this.supabase.client
      .from("session_types" as any)
      .delete()
      .eq("id", id);
    if (error) throw error;
    return { deleted: true };
  }

  async adminGetSchedules(profileId: string) {
    const { data } = await this.supabase.client
      .from("availability_schedules" as any)
      .select("*")
      .eq("profile_id", profileId)
      .order("day_of_week", { ascending: true });
    return (data ?? []) as any[];
  }

  async adminUpsertSchedule(profileId: string, dto: Record<string, unknown>) {
    const { data, error } = await this.supabase.client
      .from("availability_schedules" as any)
      .insert({ ...dto, profile_id: profileId })
      .select()
      .single();
    if (error) throw error;
    return data as any;
  }

  async adminDeleteSchedule(id: string) {
    const { error } = await this.supabase.client
      .from("availability_schedules" as any)
      .delete()
      .eq("id", id);
    if (error) throw error;
    return { deleted: true };
  }

  async adminGetOverrides(profileId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await this.supabase.client
      .from("availability_overrides" as any)
      .select("*")
      .eq("profile_id", profileId)
      .gte("date", today)
      .order("date", { ascending: true });
    return (data ?? []) as any[];
  }

  async adminUpsertOverride(profileId: string, dto: Record<string, unknown>) {
    const { data, error } = await this.supabase.client
      .from("availability_overrides" as any)
      .insert({ ...dto, profile_id: profileId })
      .select()
      .single();
    if (error) throw error;
    return data as any;
  }

  async adminDeleteOverride(id: string) {
    const { error } = await this.supabase.client
      .from("availability_overrides" as any)
      .delete()
      .eq("id", id);
    if (error) throw error;
    return { deleted: true };
  }

  async adminListBookings(profileId?: string) {
    let query = this.supabase.client
      .from("bookings" as any)
      .select("*, session_types(name, duration_minutes)")
      .order("start_at", { ascending: false });

    if (profileId) {
      query = query.eq("profile_id", profileId);
    }

    const { data } = await query;
    return (data ?? []) as any[];
  }

  async adminCancelBooking(id: string) {
    const { data: bookingData } = await this.supabase.client
      .from("bookings" as any)
      .select("id, booker_name, booker_email, start_at, timezone, session_types(name)")
      .eq("id", id)
      .eq("status", "confirmed")
      .single();

    if (!bookingData) throw new NotFoundException("Booking not found or already cancelled");
    const booking = bookingData as any;

    await this.supabase.client
      .from("bookings" as any)
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);

    const sessionName = (booking.session_types as any)?.name ?? "Session";

    this.email
      .send({
        to: booking.booker_email as string,
        subject: `Session cancelled: ${sessionName}`,
        html: this.wrapEmail(`
          <h2 style="font-family:Georgia,serif;color:#3B2F2F">Session Cancelled</h2>
          <p>Hi ${booking.booker_name as string},</p>
          <p>Your upcoming session <strong>${sessionName}</strong> has been cancelled by the host.</p>
          <p style="color:#6B7C5C">Please reach out to rebook at your convenience.</p>
        `),
      })
      .catch((err: unknown) => this.logger.error("Failed to send admin cancellation email", err));

    return { cancelled: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private generateBookingIcs(booking: Record<string, unknown>, sessionType: Record<string, unknown>): string {
    const formatDate = (d: Date): string =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    const location =
      sessionType["location_type"] === "zoom" && booking["zoom_link"]
        ? (booking["zoom_link"] as string)
        : (sessionType["location_detail"] as string) ?? "To be confirmed";

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Hammock Earth//Booking//EN",
      "BEGIN:VEVENT",
      `UID:booking-${booking["id"] as string}@hammock.earth`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(new Date(booking["start_at"] as string))}`,
      `DTEND:${formatDate(new Date(booking["end_at"] as string))}`,
      `SUMMARY:${sessionType["name"] as string}`,
      `LOCATION:${location}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
  }

  private wrapEmail(body: string): string {
    return `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#3B2F2F;padding:24px 16px">${body}</div>`;
  }
}
