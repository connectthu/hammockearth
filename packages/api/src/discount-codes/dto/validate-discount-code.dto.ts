import { IsString, IsInt, IsOptional, Min } from "class-validator";

export class ValidateDiscountCodeDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
