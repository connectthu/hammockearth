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
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";

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

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  @Post()
  create(
    @Headers("authorization") auth: string,
    @Body() dto: CreateEventDto
  ) {
    this.requireAdmin(auth);
    return this.eventsService.create(dto);
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

  private requireAdmin(auth: string) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
  }
}
