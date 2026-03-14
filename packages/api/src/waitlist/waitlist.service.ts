import { Injectable, ConflictException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { EmailService } from "../email/email.service";

interface JoinWaitlistDto {
  email: string;
  first_name?: string;
  source?: string;
}

@Injectable()
export class WaitlistService {
  constructor(
    private supabase: SupabaseService,
    private email: EmailService
  ) {}

  async join(dto: JoinWaitlistDto) {
    const { data, error } = await this.supabase.client
      .from("waitlist_signups")
      .upsert(
        {
          email: dto.email,
          first_name: dto.first_name ?? null,
          source: dto.source ?? "homepage",
        },
        { onConflict: "email", ignoreDuplicates: true }
      )
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ConflictException("Already signed up");
      }
      throw error;
    }

    // Send confirmation async
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
    return data;
  }
}
