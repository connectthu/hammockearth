import { IsEmail, IsOptional, IsString } from "class-validator";

export class JoinWaitlistDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  source?: string;
}
