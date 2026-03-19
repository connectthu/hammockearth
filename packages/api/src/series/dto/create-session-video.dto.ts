import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsIn,
  Min,
} from "class-validator";

const VIDEO_TYPES = ['main_recording', 'meditation', 'bonus', 'tutorial', 'supplementary'] as const;

export class CreateSessionVideoDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsIn(VIDEO_TYPES)
  videoType!: 'main_recording' | 'meditation' | 'bonus' | 'tutorial' | 'supplementary';

  @IsString()
  @IsOptional()
  bunnyUrl?: string;

  @IsString()
  @IsOptional()
  bunnyVideoId?: string;

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
}
