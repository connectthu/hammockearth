import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FacilitatorService } from "./facilitator.service";
import { CreateInquiryDto } from "./dto/create-inquiry.dto";

@Controller("facilitator-inquiries")
export class FacilitatorController {
  constructor(
    private facilitatorService: FacilitatorService,
    private config: ConfigService
  ) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateInquiryDto) {
    return this.facilitatorService.create(dto);
  }

  @Get()
  findAll(@Headers("authorization") auth: string) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
    return this.facilitatorService.findAll();
  }
}
