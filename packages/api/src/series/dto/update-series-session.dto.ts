import { IsString, IsOptional, IsDateString, IsIn } from "class-validator";

export class UpdateSeriesSessionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  startAt?: string;

  @IsDateString()
  @IsOptional()
  endAt?: string;

  @IsString()
  @IsOptional()
  meetingUrl?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsIn(["scheduled", "completed", "cancelled"])
  @IsOptional()
  status?: "scheduled" | "completed" | "cancelled";
}
