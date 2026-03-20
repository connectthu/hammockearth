import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  sessionTypeId!: string;

  @IsString()
  @IsNotEmpty()
  bookerName!: string;

  @IsEmail()
  bookerEmail!: string;

  @IsString()
  @IsOptional()
  bookerNotes?: string;

  /** ISO UTC timestamp for the slot start */
  @IsString()
  @IsNotEmpty()
  startAt!: string;

  /** IANA timezone name e.g. "America/Toronto" */
  @IsString()
  @IsNotEmpty()
  timezone!: string;
}
