import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsIn,
  Min,
} from "class-validator";

export class UpdateSeriesDto {
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
  coverImageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;

  @IsString()
  @IsOptional()
  location?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceCents?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  memberPriceCents?: number;

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
