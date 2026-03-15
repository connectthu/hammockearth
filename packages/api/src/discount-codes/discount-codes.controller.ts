import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DiscountCodesService } from "./discount-codes.service";
import { CreateDiscountCodeDto } from "./dto/create-discount-code.dto";
import { ValidateDiscountCodeDto } from "./dto/validate-discount-code.dto";

@Controller("discount-codes")
export class DiscountCodesController {
  constructor(
    private discountCodesService: DiscountCodesService,
    private config: ConfigService
  ) {}

  @Post("validate")
  @HttpCode(200)
  async validate(@Body() dto: ValidateDiscountCodeDto) {
    const code = await this.discountCodesService.validate(dto.code);
    return {
      valid: true,
      discountCode: code,
    };
  }

  @Get()
  findAll(@Headers("authorization") auth: string) {
    this.requireAdmin(auth);
    return this.discountCodesService.findAll();
  }

  @Post()
  create(
    @Headers("authorization") auth: string,
    @Body() dto: CreateDiscountCodeDto
  ) {
    this.requireAdmin(auth);
    return this.discountCodesService.create(dto);
  }

  @Delete(":id")
  @HttpCode(200)
  remove(
    @Headers("authorization") auth: string,
    @Param("id") id: string
  ) {
    this.requireAdmin(auth);
    return this.discountCodesService.remove(id);
  }

  private requireAdmin(auth: string) {
    const expected = `Bearer ${this.config.get("ADMIN_SECRET")}`;
    if (auth !== expected) throw new UnauthorizedException();
  }
}
