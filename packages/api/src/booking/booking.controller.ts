import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { Response } from "express";
import { BookingService } from "./booking.service";
import { GoogleCalendarService } from "./google-calendar.service";
import { SupabaseService } from "../supabase/supabase.service";
import { CreateBookingDto } from "./dto/create-booking.dto";

@Controller()
export class BookingController {
  constructor(
    private bookingService: BookingService,
    private googleCalendar: GoogleCalendarService,
    private config: ConfigService,
    private supabase: SupabaseService
  ) {}

  // ── Public endpoints ──────────────────────────────────────────────────────

  @Get("profile/:slug")
  getProfile(@Param("slug") slug: string) {
    return this.bookingService.getProfile(slug);
  }

  @Get("profile/:slug/availability")
  getAvailability(
    @Param("slug") slug: string,
    @Query("date") date: string,
    @Query("sessionTypeId") sessionTypeId: string
  ) {
    return this.bookingService.getAvailability(slug, date, sessionTypeId);
  }

  @Post("profile/:slug/bookings")
  createBooking(
    @Param("slug") slug: string,
    @Body() dto: CreateBookingDto
  ) {
    return this.bookingService.createBooking(slug, dto);
  }

  @Get("bookings/cancel/:token")
  cancelByToken(@Param("token") token: string) {
    return this.bookingService.cancelByToken(token);
  }

  // ── Admin endpoints (admin secret OR superadmin Supabase JWT) ─────────────

  @Get("booking/admin/profiles")
  async adminListProfiles(@Headers("authorization") auth: string) {
    await this.requireAdmin(auth);
    return this.bookingService.adminListProfiles();
  }

  @Post("booking/admin/profile")
  async adminUpsertProfile(
    @Headers("authorization") auth: string,
    @Body() dto: Record<string, unknown>
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminUpsertProfile(dto);
  }

  @Get("booking/admin/profile/:profileId/session-types")
  async adminGetSessionTypes(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminGetSessionTypes(profileId);
  }

  @Post("booking/admin/profile/:profileId/session-types")
  async adminUpsertSessionType(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string,
    @Body() dto: Record<string, unknown>
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminUpsertSessionType(profileId, dto);
  }

  @Delete("booking/admin/session-types/:id")
  @HttpCode(200)
  async adminDeleteSessionType(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminDeleteSessionType(id);
  }

  @Get("booking/admin/profile/:profileId/schedules")
  async adminGetSchedules(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminGetSchedules(profileId);
  }

  @Post("booking/admin/profile/:profileId/schedules")
  async adminCreateSchedule(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string,
    @Body() dto: Record<string, unknown>
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminUpsertSchedule(profileId, dto);
  }

  @Delete("booking/admin/schedules/:id")
  @HttpCode(200)
  async adminDeleteSchedule(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminDeleteSchedule(id);
  }

  @Get("booking/admin/profile/:profileId/overrides")
  async adminGetOverrides(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminGetOverrides(profileId);
  }

  @Post("booking/admin/profile/:profileId/overrides")
  async adminCreateOverride(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string,
    @Body() dto: Record<string, unknown>
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminUpsertOverride(profileId, dto);
  }

  @Delete("booking/admin/overrides/:id")
  @HttpCode(200)
  async adminDeleteOverride(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminDeleteOverride(id);
  }

  @Get("booking/admin/bookings")
  async adminListBookings(
    @Headers("authorization") auth: string,
    @Query("profileId") profileId?: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminListBookings(profileId);
  }

  @Patch("booking/admin/bookings/:id/cancel")
  async adminCancelBooking(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminCancelBooking(id);
  }

  // ── Services ──────────────────────────────────────────────────────────────

  @Get("booking/admin/profile/:profileId/services")
  async adminGetServices(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminGetServices(profileId);
  }

  @Post("booking/admin/profile/:profileId/services")
  async adminUpsertService(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string,
    @Body() dto: Record<string, unknown>
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminUpsertService(profileId, dto);
  }

  @Delete("booking/admin/services/:id")
  @HttpCode(200)
  async adminDeleteService(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminDeleteService(id);
  }

  // ── Commitment Packages ────────────────────────────────────────────────────

  @Get("booking/admin/profile/:profileId/commitment-packages")
  async adminGetCommitmentPackages(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminGetCommitmentPackages(profileId);
  }

  @Post("booking/admin/profile/:profileId/commitment-packages")
  async adminUpsertCommitmentPackage(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string,
    @Body() dto: Record<string, unknown>
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminUpsertCommitmentPackage(profileId, dto);
  }

  @Delete("booking/admin/commitment-packages/:id")
  @HttpCode(200)
  async adminDeleteCommitmentPackage(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.adminDeleteCommitmentPackage(id);
  }

  // ── Google Calendar OAuth ──────────────────────────────────────────────────

  @Get("booking/auth/google/url")
  async getGoogleAuthUrl(
    @Headers("authorization") auth: string,
    @Query("profileId") profileId: string
  ) {
    await this.requireAdmin(auth);
    const url = this.googleCalendar.getAuthUrl(profileId);
    return { url };
  }

  @Get("booking/auth/google/callback")
  async googleAuthCallback(
    @Query("code") code: string,
    @Query("state") profileId: string,
    @Res() res: Response
  ) {
    const appUrl = this.config.get<string>("APP_URL") ?? "https://hammock.earth";
    try {
      const { refreshToken, accessToken, email } = await this.googleCalendar.exchangeCode(code);
      // Fetch calendar list to find primary calendar id
      const calListRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const calList = await calListRes.json() as Record<string, unknown>;
      const items = calList["items"] as Array<{ id: string; primary?: boolean }> | undefined;
      const primaryId = items?.find((c) => c.primary)?.id ?? email;
      await this.bookingService.storeGoogleCalendarCredentials(profileId, refreshToken, primaryId, email);
      res.redirect(`${appUrl}/members/settings?google=connected`);
    } catch (err) {
      res.redirect(`${appUrl}/members/settings?google=error`);
    }
  }

  @Delete("booking/admin/profile/:profileId/google")
  @HttpCode(200)
  async disconnectGoogle(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string
  ) {
    await this.requireAdmin(auth);
    return this.bookingService.disconnectGoogleCalendar(profileId);
  }

  private async requireAdmin(auth: string | undefined): Promise<void> {
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException();
    const token = auth.slice(7);

    // Allow admin secret (used by the admin app)
    const adminSecret = this.config.get<string>("ADMIN_SECRET");
    if (token === adminSecret) return;

    // Also allow a Supabase JWT if the user has role=superadmin
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error } = await anonClient.auth.getUser(token);
    if (error || !user) throw new UnauthorizedException();

    const { data: profile } = await this.supabase.client
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if ((profile as any)?.role !== "superadmin") throw new UnauthorizedException();
  }
}
