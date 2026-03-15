import { IsString, IsInt, Min } from "class-validator";

export class ValidateDiscountCodeDto {
  @IsString()
  code: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
