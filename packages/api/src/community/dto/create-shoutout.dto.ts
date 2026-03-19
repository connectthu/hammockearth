import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class CreateShoutoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  body!: string;
}
