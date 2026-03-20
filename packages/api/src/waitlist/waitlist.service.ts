import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SupabaseService } from "../supabase/supabase.service";
import { EmailService } from "../email/email.service";
import type { JoinWaitlistDto } from "./dto/join-waitlist.dto";
import type { Database } from "@hammock/database";

type WaitlistInsert =
  Database["public"]["Tables"]["waitlist_signups"]["Insert"];

const RESEND_AUDIENCE_ID = "e21a96e0-9f0b-4b15-98d3-535239c73651";

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private supabase: SupabaseService,
    private email: EmailService,
    private config: ConfigService
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

    this.addToResendAudience(dto.email, dto.first_name).catch(() => {});

    return { success: true };
  }

  private async addToResendAudience(email: string, firstName?: string) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    if (!apiKey) return;

    const res = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          first_name: firstName ?? undefined,
          unsubscribed: false,
        }),
      }
    );

    if (!res.ok) {
      this.logger.warn(`Resend audience add failed: ${res.status}`);
    }
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
