import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { EmailService } from "../email/email.service";
import type { JoinWaitlistDto } from "./dto/join-waitlist.dto";
import type { Database } from "@hammock/database";

type WaitlistInsert =
  Database["public"]["Tables"]["waitlist_signups"]["Insert"];

@Injectable()
export class WaitlistService {
  constructor(
    private supabase: SupabaseService,
    private email: EmailService
  ) {}

  async join(dto: JoinWaitlistDto) {
    const payload: WaitlistInsert = {
      email: dto.email,
      first_name: dto.first_name ?? null,
      source: dto.source ?? "homepage",
    };

    const { error } = await this.supabase.client
      .from("waitlist_signups")
      .insert(payload);

    if (error) {
      // 23505 = unique violation (duplicate email) — treat as success
      if (error.code === "23505") {
        return { success: true };
      }
      throw error;
    }

    this.email
      .waitlistConfirmation({ to: dto.email, firstName: dto.first_name })
      .catch(() => {});

    return { success: true };
  }

  async findAll() {
    const { data, error } = await this.supabase.client
      .from("waitlist_signups")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }
}
