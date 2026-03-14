import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { EmailService } from "../email/email.service";
import type { CreateInquiryDto } from "./dto/create-inquiry.dto";

@Injectable()
export class FacilitatorService {
  constructor(
    private supabase: SupabaseService,
    private email: EmailService
  ) {}

  async create(dto: CreateInquiryDto) {
    const { data, error } = await this.supabase.client
      .from("facilitator_inquiries")
      .insert(dto)
      .select()
      .single();

    if (error) throw error;

    // Fire-and-forget notification
    this.email.facilitatorInquiryNotification(dto).catch(() => {});

    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase.client
      .from("facilitator_inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }
}
