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

export class CreateSeriesDto {
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
  coverImageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;

  @IsString()
  @IsOptional()
  location?: string;

  @IsInt()
  @Min(1)
  durationWeeks!: number;

  @IsInt()
  @Min(1)
  sessionCount!: number;

  @IsDateString()
  firstSessionAt!: string;

  @IsIn(["weekly", "biweekly", "monthly"])
  @IsOptional()
  sessionFrequency?: "weekly" | "biweekly" | "monthly";

  @IsInt()
  @Min(1)
  @IsOptional()
  sessionDurationMinutes?: number;

  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsInt()
  @Min(0)
  memberPriceCents!: number;

  @IsBoolean()
  @IsOptional()
  dropInEnabled?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  dropInPriceCents?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  dropInMemberPriceCents?: number;

  @IsIn(["public", "members_only"])
  @IsOptional()
  visibility?: "public" | "members_only";

  @IsIn(["draft", "published", "cancelled"])
  @IsOptional()
  status?: "draft" | "published" | "cancelled";

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
