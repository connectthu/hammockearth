import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WaitlistService } from "./waitlist.service";
import { IsEmail, IsOptional, IsString } from "class-validator";

class JoinWaitlistDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  source?: string;
}

@Controller("waitlist")
export class WaitlistController {
  constructor(
    private waitlistService: WaitlistService,
    private config: ConfigService
  ) {}

  @Post()
  @HttpCode(200)
  join(@Body() dto: JoinWaitlistDto) {
    return this.waitlistService.join(dto);
  }

  @Get()
  findAll(@Headers("authorization") auth: string) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
    return this.waitlistService.findAll();
  }
}
