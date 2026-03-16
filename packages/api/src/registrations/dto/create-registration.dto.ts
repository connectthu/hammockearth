import {
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  MinLength,
  Min,
} from "class-validator";

export class CreateRegistrationDto {
  @IsString()
  eventSlug: string;

  @IsString()
  @MinLength(1)
  guestName: string;

  @IsEmail()
  guestEmail: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  discountCode?: string;
}
