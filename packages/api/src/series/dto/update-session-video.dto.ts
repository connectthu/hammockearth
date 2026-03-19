import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  IsBoolean,
  Min,
} from "class-validator";

const VIDEO_TYPES = ['main_recording', 'meditation', 'bonus', 'tutorial', 'supplementary'] as const;

export class UpdateSessionVideoDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsIn(VIDEO_TYPES)
  @IsOptional()
  videoType?: 'main_recording' | 'meditation' | 'bonus' | 'tutorial' | 'supplementary';

  @IsString()
  @IsOptional()
  bunnyUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  facilitator?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  durationMinutes?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
