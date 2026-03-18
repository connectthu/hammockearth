import { Module, Global } from "@nestjs/common";
import { EmailService } from "./email.service";
import { SupabaseModule } from "../supabase/supabase.module";

@Global()
@Module({
  imports: [SupabaseModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
