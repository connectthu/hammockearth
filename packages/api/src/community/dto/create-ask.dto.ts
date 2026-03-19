import { IsString, IsNotEmpty, MaxLength, IsIn } from "class-validator";

const ASK_CATEGORIES = ["gardening", "advice", "carpool", "tools", "veggie_swap", "referral"];

export class CreateAskDto {
  @IsString()
  @IsIn(ASK_CATEGORIES)
  category!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  body!: string;
}
