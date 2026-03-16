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
} from "@nestjs/common";
import { SeriesService } from "./series.service";
import { CreateSeriesDto } from "./dto/create-series.dto";
import { UpdateSeriesDto } from "./dto/update-series.dto";
import { UpdateSeriesSessionDto } from "./dto/update-series-session.dto";
import { ConfigService } from "@nestjs/config";

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
