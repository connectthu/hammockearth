import { IsString, IsNotEmpty, IsUrl, MaxLength } from "class-validator";

export class SubmitResourceDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: "external_url must be a valid URL" })
  external_url!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  summary!: string;
}
