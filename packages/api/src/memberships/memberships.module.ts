import { Module } from "@nestjs/common";
import { MembershipsController } from "./memberships.controller";
import { MembershipsService } from "./memberships.service";
import { DiscountCodesModule } from "../discount-codes/discount-codes.module";

@Module({
  imports: [DiscountCodesModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
