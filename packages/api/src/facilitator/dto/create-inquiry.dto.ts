import { IsString, IsEmail, IsNotEmpty, MaxLength } from "class-validator";

export class CreateInquiryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;
}
