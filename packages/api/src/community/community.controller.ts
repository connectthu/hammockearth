import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  UnauthorizedException,
  HttpCode,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommunityService } from "./community.service";
import { CreateShoutoutDto } from "./dto/create-shoutout.dto";
import { CreateAskDto } from "./dto/create-ask.dto";

@Controller("community")
export class CommunityController {
  constructor(
    private community: CommunityService,
    private config: ConfigService
  ) {}

  // ── Shoutouts ────────────────────────────────────────────────────────────────

  @Get("shoutouts")
  async listShoutouts(
    @Headers("authorization") auth: string | undefined,
    @Query("cursor") cursor?: string
  ) {
    const userId = await this.requireUser(auth);
    return this.community.listShoutouts(userId, cursor);
  }

  @Post("shoutouts")
  async createShoutout(
    @Headers("authorization") auth: string | undefined,
    @Body() dto: CreateShoutoutDto
  ) {
    const userId = await this.requireUser(auth);
    return this.community.createShoutout(userId, dto);
  }

  @Post("shoutouts/:id/heart")
  @HttpCode(200)
  async toggleHeart(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string
  ) {
    const userId = await this.requireUser(auth);
    return this.community.toggleShoutoutHeart(id, userId);
  }

  @Delete("shoutouts/:id")
  @HttpCode(200)
  async deleteShoutout(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string
  ) {
    const userId = await this.requireUser(auth);
    return this.community.deleteShoutout(id, userId, false);
  }

  // ── Asks ─────────────────────────────────────────────────────────────────────

  @Get("asks")
  async listAsks(
    @Headers("authorization") auth: string | undefined,
    @Query("category") category?: string,
    @Query("status") status?: string
  ) {
    const userId = await this.requireUser(auth);
    return this.community.listAsks(userId, { category, status });
  }

  @Post("asks")
  async createAsk(
    @Headers("authorization") auth: string | undefined,
    @Body() dto: CreateAskDto
  ) {
    const userId = await this.requireUser(auth);
    return this.community.createAsk(userId, dto);
  }

  @Post("asks/:id/support")
  @HttpCode(200)
  async supportAsk(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string
  ) {
    const userId = await this.requireUser(auth);
    return this.community.supportAsk(id, userId);
  }

  @Patch("asks/:id/close")
  async closeAsk(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string
  ) {
    const userId = await this.requireUser(auth);
    return this.community.closeAsk(id, userId);
  }

  @Delete("asks/:id")
  @HttpCode(200)
  async deleteAsk(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string
  ) {
    const userId = await this.requireUser(auth);
    return this.community.deleteAsk(id, userId, false);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────────

  @Get("admin/shoutouts")
  adminListShoutouts(@Headers("authorization") auth: string) {
    this.requireAdmin(auth);
    return this.community.adminListShoutouts();
  }

  @Get("admin/asks")
  adminListAsks(@Headers("authorization") auth: string) {
    this.requireAdmin(auth);
    return this.community.adminListAsks();
  }

  @Delete("admin/shoutouts/:id")
  @HttpCode(200)
  async adminDeleteShoutout(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    this.requireAdmin(auth);
    // Use a placeholder userId — isAdmin=true skips ownership check
    return this.community.deleteShoutout(id, "admin", true);
  }

  @Delete("admin/asks/:id")
  @HttpCode(200)
  async adminDeleteAsk(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    this.requireAdmin(auth);
    return this.community.deleteAsk(id, "admin", true);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private requireAdmin(auth: string) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
  }

  private async requireUser(auth: string | undefined): Promise<string> {
    const userId = await this.community.getUserIdFromToken(auth);
    if (!userId) throw new UnauthorizedException();
    return userId;
  }
}
