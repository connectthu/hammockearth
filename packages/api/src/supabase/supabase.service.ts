import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createSupabaseClient } from "@hammock/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@hammock/database";

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient<Database>;

  constructor(private config: ConfigService) {
    const url = this.config.getOrThrow<string>("NEXT_PUBLIC_SUPABASE_URL");
    const key = this.config.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY");
    this.client = createSupabaseClient(url, key);
  }
}
