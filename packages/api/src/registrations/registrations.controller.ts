import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RegistrationsService } from "./registrations.service";
import { CreateRegistrationDto } from "./dto/create-registration.dto";

@Controller("registrations")
export class RegistrationsController {
  constructor(
    private registrationsService: RegistrationsService,
    private config: ConfigService
  ) {}

  @Post()
  create(
    @Body() dto: CreateRegistrationDto,
    @Headers("authorization") authorization?: string,
  ) {
    const token = authorization?.replace("Bearer ", "");
    return this.registrationsService.createRegistration(dto, token);
  }

  @Post(":id/cancel")
  @HttpCode(200)
  cancel(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    this.requireAdmin(auth);
    return this.registrationsService.cancelRegistration(id);
  }

  private requireAdmin(auth: string) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
  }
}
