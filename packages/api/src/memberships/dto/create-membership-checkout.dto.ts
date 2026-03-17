import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMembershipCheckoutDto {
  @IsIn(["season_pass", "farm_friend"])
  membershipType!: "season_pass" | "farm_friend";

  @IsOptional()
  @IsString()
  priceWindowSlug?: string; // 'founding' | 'early_bird' | 'regular' — required for season_pass

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;
}
