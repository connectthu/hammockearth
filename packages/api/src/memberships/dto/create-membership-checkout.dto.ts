import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMembershipCheckoutDto {
  @IsIn(["season_pass", "farm_friend", "try_a_month"])
  membershipType!: "season_pass" | "farm_friend" | "try_a_month";

  @IsOptional()
  @IsIn(["one_time", "recurring"])
  billingMode?: "one_time" | "recurring";

  @IsOptional()
  @IsString()
  priceWindowSlug?: string; // 'founding' | 'early_bird' | 'regular' — required for season_pass

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  discountCode?: string;
}
