import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Headers,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommunicationsService } from "./communications.service";
import type { UpdateTemplateDto } from "./dto/update-template.dto";
import type { UpdateNotificationDto } from "./dto/update-notification.dto";

@Controller("communications")
export class CommunicationsController {
  constructor(
    private communications: CommunicationsService,
    private config: ConfigService
  ) {}

  @Get("templates")
  listTemplates(@Headers("authorization") auth: string) {
    this.requireAdmin(auth);
    return this.communications.listTemplates();
  }

  @Get("templates/:key")
  getTemplate(
    @Headers("authorization") auth: string,
    @Param("key") key: string
  ) {
    this.requireAdmin(auth);
    return this.communications.getTemplate(key);
  }

  @Put("templates/:key")
  updateTemplate(
    @Headers("authorization") auth: string,
    @Param("key") key: string,
    @Body() dto: UpdateTemplateDto
  ) {
    this.requireAdmin(auth);
    return this.communications.updateTemplate(key, dto);
  }

  @Get("notifications")
  listNotifications(@Headers("authorization") auth: string) {
    this.requireAdmin(auth);
    return this.communications.listNotifications();
  }

  @Put("notifications/:key")
  updateNotification(
    @Headers("authorization") auth: string,
    @Param("key") key: string,
    @Body() dto: UpdateNotificationDto
  ) {
    this.requireAdmin(auth);
    return this.communications.updateNotification(key, dto);
  }

  private requireAdmin(auth: string) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
  }
}
