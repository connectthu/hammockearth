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
  Req,
  UseGuards,
  UnauthorizedException,
  HttpCode,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";

@Controller("events")
export class EventsController {
  constructor(
    private eventsService: EventsService,
    private config: ConfigService
  ) {}

  @Get()
  findAll() {
    return this.eventsService.findAll(false);
  }

  @Get("admin")
  findAllAdmin(@Headers("authorization") auth: string) {
    this.requireAdmin(auth);
    return this.eventsService.findAll(true);
  }

  // Must be declared before :slug to avoid route shadowing
  @Get("collaborator-accounts")
  listCollaboratorAccounts(@Headers("authorization") auth: string) {
    this.requireAdmin(auth);
    return this.eventsService.listCollaboratorAccounts();
  }

  @Post("collaborator-accounts")
  createOrPromoteCollaborator(
    @Headers("authorization") auth: string,
    @Body("email") email: string,
    @Body("name") name?: string,
    @Body("linkToEventSlug") linkToEventSlug?: string,
  ) {
    this.requireAdmin(auth);
    return this.eventsService.createOrPromoteCollaborator(email, name, linkToEventSlug);
  }

  // ── Access grants (declared before :slug to avoid shadowing) ─────────────

  @Get(":id/access-grants/users/search")
  searchUsersForGrant(
    @Param("id") _id: string,
    @Query("q") q: string,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.eventsService.searchUsersForGrant(q ?? "");
  }

  @Get(":id/access-grants")
  listEventAccessGrants(
    @Param("id") id: string,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.eventsService.listEventAccessGrants(id);
  }

  @Post(":id/access-grants")
  @HttpCode(201)
  grantEventAccess(
    @Param("id") id: string,
    @Body("userId") userId: string,
    @Body("note") note: string | undefined,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.eventsService.grantEventAccess(id, userId, note);
  }

  @Delete(":id/access-grants/:userId")
  @HttpCode(200)
  revokeEventAccess(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Headers("authorization") auth?: string,
  ) {
    this.requireAdmin(auth);
    return this.eventsService.revokeEventAccess(id, userId);
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  @Get(":slug/collaborators")
  getCollaborators(
    @Headers("authorization") auth: string,
    @Param("slug") slug: string,
  ) {
    this.requireAdmin(auth);
    return this.eventsService.getEventCollaborators(slug);
  }

  @Post(":slug/collaborators")
  addCollaborator(
    @Headers("authorization") auth: string,
    @Param("slug") slug: string,
    @Body("userId") userId: string,
  ) {
    this.requireAdmin(auth);
    return this.eventsService.addEventCollaborator(slug, userId);
  }

  @Delete(":slug/collaborators/:userId")
  @HttpCode(200)
  removeCollaborator(
    @Headers("authorization") auth: string,
    @Param("slug") slug: string,
    @Param("userId") userId: string,
  ) {
    this.requireAdmin(auth);
    return this.eventsService.removeEventCollaborator(slug, userId);
  }

  @Post(":slug/duplicate")
  @HttpCode(201)
  duplicateEvent(
    @Headers("authorization") auth: string,
    @Param("slug") slug: string,
  ) {
    this.requireAdmin(auth);
    return this.eventsService.duplicate(slug);
  }

  @Post()
  create(
    @Headers("authorization") auth: string,
    @Body() dto: CreateEventDto
  ) {
    this.requireAdmin(auth);
    return this.eventsService.create(dto);
  }

  @Patch(":slug/collaborator")
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(200)
  collaboratorUpdate(
    @Param("slug") slug: string,
    @Req() req: any,
    @Body("title") title: string,
    @Body("description") description: string | undefined,
    @Body("confirmationDetails") confirmationDetails: string | undefined,
  ) {
    return this.eventsService.collaboratorUpdate(slug, req.userId, title, description, confirmationDetails);
  }

  @Patch(":slug")
  update(
    @Headers("authorization") auth: string,
    @Param("slug") slug: string,
    @Body() dto: UpdateEventDto
  ) {
    this.requireAdmin(auth);
    return this.eventsService.update(slug, dto);
  }

  @Delete(":slug")
  @HttpCode(200)
  remove(
    @Headers("authorization") auth: string,
    @Param("slug") slug: string
  ) {
    this.requireAdmin(auth);
    return this.eventsService.remove(slug);
  }

  private requireAdmin(auth: string | undefined) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
  }
}
