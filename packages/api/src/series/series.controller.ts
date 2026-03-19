import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  Query,
  HttpCode,
  UseGuards,
  Req,
} from "@nestjs/common";
import { SeriesService } from "./series.service";
import { CreateSeriesDto } from "./dto/create-series.dto";
import { UpdateSeriesDto } from "./dto/update-series.dto";
import { UpdateSeriesSessionDto } from "./dto/update-series-session.dto";
import { CreateSessionVideoDto } from "./dto/create-session-video.dto";
import { UpdateSessionVideoDto } from "./dto/update-session-video.dto";
import { ConfigService } from "@nestjs/config";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";

@Controller("series")
export class SeriesController {
  constructor(
    private seriesService: SeriesService,
    private config: ConfigService
  ) {}

  private requireAdmin(authHeader?: string) {
    const secret = this.config.get<string>("ADMIN_SECRET");
    if (!secret) return;
    const token = authHeader?.replace("Bearer ", "");
    if (token !== secret) throw new UnauthorizedException();
  }

  @Get()
  findAll(@Query("admin") admin?: string, @Headers("authorization") auth?: string) {
    const includeUnpublished = admin === "true";
    if (includeUnpublished) this.requireAdmin(auth);
    return this.seriesService.findAll(includeUnpublished);
  }

  // ── Session videos (declared before :slug to avoid shadowing) ────────────

  @Post(":id/sessions/:sessionId/videos/upload-url")
  getVideoUploadUrl(
    @Param("sessionId") sessionId: string,
    @Body("title") title: string,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.seriesService.getVideoUploadUrl(sessionId, title ?? "Untitled");
  }

  @Post(":id/sessions/:sessionId/videos")
  createSessionVideo(
    @Param("sessionId") sessionId: string,
    @Body() dto: CreateSessionVideoDto,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.seriesService.createSessionVideo(sessionId, dto);
  }

  @Get(":id/sessions/:sessionId/videos")
  listSessionVideos(
    @Param("sessionId") sessionId: string,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.seriesService.listSessionVideos(sessionId);
  }

  @Patch(":id/sessions/:sessionId/videos/:videoId")
  updateSessionVideo(
    @Param("videoId") videoId: string,
    @Body() dto: UpdateSessionVideoDto,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.seriesService.updateSessionVideo(videoId, dto);
  }

  @Delete(":id/sessions/:sessionId/videos/:videoId")
  @HttpCode(200)
  deleteSessionVideo(
    @Param("videoId") videoId: string,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.seriesService.deleteSessionVideo(videoId);
  }

  @Get(":slug/recordings")
  @UseGuards(SupabaseAuthGuard)
  getSeriesRecordings(@Param("slug") slug: string, @Req() req: any) {
    return this.seriesService.getSeriesRecordings(slug, req.userId);
  }

  // ── Access grants (declared before :slug to avoid shadowing) ─────────────

  @Get(":id/access-grants/users/search")
  searchUsersForGrant(
    @Param("id") _id: string,
    @Query("q") q: string,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.seriesService.searchUsersForGrant(q ?? "");
  }

  @Get(":id/access-grants")
  listSeriesAccessGrants(
    @Param("id") id: string,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.seriesService.listSeriesAccessGrants(id);
  }

  @Post(":id/access-grants")
  @HttpCode(201)
  grantSeriesAccess(
    @Param("id") id: string,
    @Body("userId") userId: string,
    @Body("note") note: string | undefined,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.seriesService.grantSeriesAccess(id, userId, note);
  }

  @Delete(":id/access-grants/:userId")
  @HttpCode(200)
  revokeSeriesAccess(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.seriesService.revokeSeriesAccess(id, userId);
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.seriesService.findBySlug(slug);
  }

  @Post()
  create(
    @Body() dto: CreateSeriesDto,
    @Headers("authorization") auth?: string
  ) {
    this.requireAdmin(auth);
    return this.seriesService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateSeriesDto,
    @Headers("authorization") auth?: string
  ) {
    this.requireAdmin(auth);
    return this.seriesService.update(id, dto);
  }

  @Patch(":id/sessions/:sessionId")
  updateSession(
    @Param("id") id: string,
    @Param("sessionId") sessionId: string,
    @Body() dto: UpdateSeriesSessionDto,
    @Headers("authorization") auth?: string
  ) {
    this.requireAdmin(auth);
    return this.seriesService.updateSession(id, sessionId, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Headers("authorization") auth?: string) {
    this.requireAdmin(auth);
    return this.seriesService.remove(id);
  }
}
