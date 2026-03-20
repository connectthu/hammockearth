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
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BookingService } from "./booking.service";
import { CreateBookingDto } from "./dto/create-booking.dto";

@Controller()
export class BookingController {
  constructor(
    private bookingService: BookingService,
    private config: ConfigService
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

  // ── Admin endpoints (bearer token) ────────────────────────────────────────

  @Get("booking/admin/profiles")
  adminListProfiles(@Headers("authorization") auth: string) {
    this.requireAdmin(auth);
    return this.bookingService.adminListProfiles();
  }

  @Post("booking/admin/profile")
  adminUpsertProfile(
    @Headers("authorization") auth: string,
    @Body() dto: Record<string, unknown>
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminUpsertProfile(dto);
  }

  @Get("booking/admin/profile/:profileId/session-types")
  adminGetSessionTypes(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminGetSessionTypes(profileId);
  }

  @Post("booking/admin/profile/:profileId/session-types")
  adminUpsertSessionType(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string,
    @Body() dto: Record<string, unknown>
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminUpsertSessionType(profileId, dto);
  }

  @Delete("booking/admin/session-types/:id")
  @HttpCode(200)
  adminDeleteSessionType(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminDeleteSessionType(id);
  }

  @Get("booking/admin/profile/:profileId/schedules")
  adminGetSchedules(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminGetSchedules(profileId);
  }

  @Post("booking/admin/profile/:profileId/schedules")
  adminCreateSchedule(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string,
    @Body() dto: Record<string, unknown>
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminUpsertSchedule(profileId, dto);
  }

  @Delete("booking/admin/schedules/:id")
  @HttpCode(200)
  adminDeleteSchedule(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminDeleteSchedule(id);
  }

  @Get("booking/admin/profile/:profileId/overrides")
  adminGetOverrides(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminGetOverrides(profileId);
  }

  @Post("booking/admin/profile/:profileId/overrides")
  adminCreateOverride(
    @Headers("authorization") auth: string,
    @Param("profileId") profileId: string,
    @Body() dto: Record<string, unknown>
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminUpsertOverride(profileId, dto);
  }

  @Delete("booking/admin/overrides/:id")
  @HttpCode(200)
  adminDeleteOverride(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminDeleteOverride(id);
  }

  @Get("booking/admin/bookings")
  adminListBookings(
    @Headers("authorization") auth: string,
    @Query("profileId") profileId?: string
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminListBookings(profileId);
  }

  @Patch("booking/admin/bookings/:id/cancel")
  adminCancelBooking(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    this.requireAdmin(auth);
    return this.bookingService.adminCancelBooking(id);
  }

  private requireAdmin(auth: string | undefined): void {
    const expected = `Bearer ${this.config.get<string>("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
  }
}
