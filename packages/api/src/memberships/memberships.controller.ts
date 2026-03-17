import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MembershipsService } from "./memberships.service";
import { CreateMembershipCheckoutDto } from "./dto/create-membership-checkout.dto";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";

@Controller("memberships")
export class MembershipsController {
  constructor(
    private membershipsService: MembershipsService,
    private config: ConfigService
  ) {}

  // ── User endpoints (Supabase JWT) ──────────────────────────────────────────

  @Post("checkout")
  @UseGuards(SupabaseAuthGuard)
  checkout(@Body() dto: CreateMembershipCheckoutDto, @Req() req: any) {
    return this.membershipsService.checkout(dto, req.userId);
  }

  @Get("me")
  @UseGuards(SupabaseAuthGuard)
  getMyMembership(@Req() req: any) {
    return this.membershipsService.findByUserId(req.userId);
  }

  @Delete("me")
  @UseGuards(SupabaseAuthGuard)
  cancelMyMembership(@Req() req: any) {
    return this.membershipsService.cancel(req.userId);
  }

  // ── Admin endpoints (bearer token) ────────────────────────────────────────

  @Get()
  findAll(@Headers("authorization") auth: string) {
    this.requireAdmin(auth);
    return this.membershipsService.findAll();
  }

  @Patch(":id")
  updateStatus(
    @Headers("authorization") auth: string,
    @Param("id") id: string,
    @Body("status") status: string
  ) {
    this.requireAdmin(auth);
    return this.membershipsService.updateStatus(id, status);
  }

  private requireAdmin(auth: string) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
  }
}
