import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  IsArray,
  IsIn,
  Min,
} from "class-validator";

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

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
  @IsOptional()
  start_at?: string;

  @IsDateString()
  @IsOptional()
  end_at?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsBoolean()
  @IsOptional()
  is_online?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  price_cents?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  member_price_cents?: number;

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

  @IsString()
  @IsOptional()
  confirmation_details?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
