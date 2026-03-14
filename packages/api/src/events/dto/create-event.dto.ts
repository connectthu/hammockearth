import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  IsArray,
  IsIn,
  Min,
} from "class-validator";

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  event_type?: string;

  @IsString()
  @IsOptional()
  cover_image_url?: string;

  @IsDateString()
  start_at!: string;

  @IsDateString()
  @IsOptional()
  end_at?: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsBoolean()
  @IsOptional()
  is_online?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsInt()
  @Min(0)
  price_cents!: number;

  @IsInt()
  @Min(0)
  member_price_cents!: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  member_ticket_allowance?: number;

  @IsIn(["public", "members_only"])
  @IsOptional()
  visibility?: "public" | "members_only";

  @IsIn(["draft", "published", "cancelled"])
  @IsOptional()
  status?: "draft" | "published" | "cancelled";

  @IsString()
  @IsOptional()
  registration_url?: string;

  @IsString()
  @IsOptional()
  registration_note?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
