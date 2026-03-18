import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { UpdateTemplateDto } from "./dto/update-template.dto";
import type { UpdateNotificationDto } from "./dto/update-notification.dto";

@Injectable()
export class CommunicationsService {
  constructor(private supabase: SupabaseService) {}

  async listTemplates() {
    const { data, error } = await this.supabase.client
      .from("email_templates" as any)
      .select("key,name,description,subject,variables,updated_at")
      .order("key");
    if (error) throw error;
    return data ?? [];
  }

  async getTemplate(key: string) {
    const { data, error } = await this.supabase.client
      .from("email_templates" as any)
      .select("*")
      .eq("key", key)
      .single();
    if (error) throw error;
    return data;
  }

  async updateTemplate(key: string, dto: UpdateTemplateDto) {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.subject !== undefined) update.subject = dto.subject;
    if (dto.body_html !== undefined) update.body_html = dto.body_html;

    const { data, error } = await this.supabase.client
      .from("email_templates" as any)
      .update(update)
      .eq("key", key)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async listNotifications() {
    const { data, error } = await this.supabase.client
      .from("notification_settings" as any)
      .select("*")
      .order("key");
    if (error) throw error;
    return data ?? [];
  }

  async getNotification(key: string) {
    const { data, error } = await this.supabase.client
      .from("notification_settings" as any)
      .select("*")
      .eq("key", key)
      .single();
    if (error) throw error;
    return data;
  }

  async updateNotification(key: string, dto: UpdateNotificationDto) {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (dto.enabled !== undefined) update.enabled = dto.enabled;
    if (dto.recipient_emails !== undefined) update.recipient_emails = dto.recipient_emails;

    const { data, error } = await this.supabase.client
      .from("notification_settings" as any)
      .update(update)
      .eq("key", key)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
