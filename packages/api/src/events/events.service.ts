import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CreateEventDto } from "./dto/create-event.dto";
import type { UpdateEventDto } from "./dto/update-event.dto";

@Injectable()
export class EventsService {
  constructor(private supabase: SupabaseService) {}

  async findAll(includeUnpublished = false) {
    let query = this.supabase.client
      .from("events")
      .select("*")
      .order("start_at", { ascending: true });

    if (!includeUnpublished) {
      query = query
        .eq("status", "published")
        .eq("visibility", "public")
        .gte("start_at", new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async findBySlug(slug: string) {
    const { data, error } = await this.supabase.client
      .from("events")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) throw new NotFoundException(`Event not found: ${slug}`);
    return data;
  }

  async create(dto: CreateEventDto, createdBy?: string) {
    const { data, error } = await this.supabase.client
      .from("events")
      .insert({
        ...dto,
        created_by: createdBy ?? null,
        tags: dto.tags ?? [],
        is_online: dto.is_online ?? false,
        visibility: dto.visibility ?? "public",
        status: dto.status ?? "draft",
        member_ticket_allowance: dto.member_ticket_allowance ?? 2,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ConflictException(`Slug "${dto.slug}" already exists`);
      }
      throw error;
    }
    return data;
  }

  async update(slug: string, dto: UpdateEventDto) {
    const { data, error } = await this.supabase.client
      .from("events")
      .update(dto)
      .eq("slug", slug)
      .select()
      .single();

    if (error || !data) throw new NotFoundException(`Event not found: ${slug}`);
    return data;
  }

  async remove(slug: string) {
    const { error } = await this.supabase.client
      .from("events")
      .update({ status: "cancelled" })
      .eq("slug", slug);

    if (error) throw error;
    return { success: true };
  }
}
