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
import { ContentLibraryService } from "./content-library.service";
import type { CreateContentDto } from "./dto/create-content.dto";
import type { UpdateContentDto } from "./dto/update-content.dto";
import type { CreateCommentDto } from "./dto/create-comment.dto";

@Controller("content")
export class ContentLibraryController {
  constructor(
    private content: ContentLibraryService,
    private config: ConfigService
  ) {}

  // ── Public / member endpoints ────────────────────────────────────────────────

  @Get()
  listPublished(
    @Headers("authorization") auth: string | undefined,
    @Query("type") type?: string,
    @Query("topic") topic?: string
  ) {
    return this.content.getUserIdFromToken(auth).then((userId) =>
      this.content.listPublished({ userId, contentType: type, topic })
    );
  }

  @Get(":slug")
  getBySlug(
    @Headers("authorization") auth: string | undefined,
    @Param("slug") slug: string
  ) {
    return this.content.getUserIdFromToken(auth).then((userId) =>
      this.content.getBySlug(slug, userId)
    );
  }

  @Post(":id/heart")
  @HttpCode(200)
  async toggleHeart(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string
  ) {
    const userId = await this.requireUser(auth);
    return this.content.toggleHeart(id, userId);
  }

  @Get(":id/comments")
  async getComments(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string
  ) {
    const userId = await this.requireUser(auth);
    return this.content.getComments(id, userId);
  }

  @Post(":id/comments")
  async addComment(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
    @Body() dto: CreateCommentDto
  ) {
    const userId = await this.requireUser(auth);
    return this.content.addComment(id, userId, dto);
  }

  @Delete(":id/comments/:commentId")
  @HttpCode(200)
  async deleteComment(
    @Headers("authorization") auth: string | undefined,
    @Param("commentId") commentId: string
  ) {
    const userId = await this.requireUser(auth);
    return this.content.deleteComment(commentId, userId);
  }

  // ── Admin CRUD ───────────────────────────────────────────────────────────────

  @Get("admin/list")
  listAll(@Headers("authorization") auth: string) {
    this.requireAdmin(auth);
    return this.content.listAll();
  }

  @Get("admin/:id")
  getById(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    this.requireAdmin(auth);
    return this.content.getById(id);
  }

  @Post()
  createContent(
    @Headers("authorization") auth: string,
    @Body() dto: CreateContentDto
  ) {
    this.requireAdmin(auth);
    return this.content.create(dto);
  }

  @Patch(":id")
  updateContent(
    @Headers("authorization") auth: string,
    @Param("id") id: string,
    @Body() dto: UpdateContentDto
  ) {
    this.requireAdmin(auth);
    return this.content.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(200)
  removeContent(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    this.requireAdmin(auth);
    return this.content.remove(id);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private requireAdmin(auth: string) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
  }

  private async requireUser(auth: string | undefined): Promise<string> {
    const userId = await this.content.getUserIdFromToken(auth);
    if (!userId) throw new UnauthorizedException();
    return userId;
  }

}
