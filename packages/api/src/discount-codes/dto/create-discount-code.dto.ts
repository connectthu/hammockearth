import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsInt,
  Min,
  IsBoolean,
} from "class-validator";
import type { DiscountType } from "@hammock/database";

export class CreateDiscountCodeDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(["percent", "fixed"])
  discount_type: DiscountType;

  @IsNumber()
  @Min(0)
  discount_value: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_uses?: number;

  @IsOptional()
  @IsString()
  valid_from?: string;

  @IsOptional()
  @IsString()
  valid_until?: string;

  @IsOptional()
  @IsBoolean()
  members_only?: boolean;
}
