import {
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  IsIn,
  IsBoolean,
  MinLength,
  Min,
} from "class-validator";

export class CreateRegistrationDto {
  @IsOptional()
  @IsString()
  eventSlug?: string;

  @IsOptional()
  @IsString()
  seriesSlug?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsIn(["single_event", "full_series", "drop_in_session"])
  @IsOptional()
  registrationType?: "single_event" | "full_series" | "drop_in_session";

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

  @IsBoolean()
  @IsOptional()
  useMemberPrice?: boolean;
}
