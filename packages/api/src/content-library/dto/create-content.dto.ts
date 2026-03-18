import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsDateString,
  IsIn,
} from "class-validator";

const CONTENT_TYPES = ["blog_post", "meditation", "video", "recipe", "reflection", "guide", "audio"];
const MEDIA_KINDS = ["video", "audio", "pdf"];

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  cover_image_url?: string;

  @IsString()
  @IsIn(CONTENT_TYPES)
  content_type!: string;

  @IsOptional()
  @IsString()
  media_url?: string;

  @IsOptional()
  @IsString()
  @IsIn(MEDIA_KINDS)
  media_kind?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visible_to?: string[];

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsInt()
  read_time_minutes?: number;

  @IsOptional()
  @IsInt()
  watch_listen_minutes?: number;

  @IsOptional()
  @IsDateString()
  published_at?: string | null;
}
