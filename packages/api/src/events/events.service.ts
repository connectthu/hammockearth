import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CreateEventDto } from "./dto/create-event.dto";
import type { UpdateEventDto } from "./dto/update-event.dto";
import type { Event, EventInsert, EventUpdate } from "@hammock/database";

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
    return data ?? [];
  }

  async findBySlug(slug: string): Promise<Event> {
    const { data, error } = await this.supabase.client
      .from("events")
      .select("*")
      .eq("slug", slug)
      .limit(1);

    if (error || !data || data.length === 0) throw new NotFoundException(`Event not found: ${slug}`);
    return data[0] as unknown as Event;
  }

  async create(dto: CreateEventDto, createdBy?: string) {
    const payload: EventInsert = {
      title: dto.title,
      slug: dto.slug,
      description: dto.description ?? null,
      event_type: dto.event_type ?? null,
      cover_image_url: dto.cover_image_url ?? null,
      start_at: dto.start_at,
      end_at: dto.end_at ?? null,
      location: dto.location,
      is_online: dto.is_online ?? false,
      capacity: dto.capacity ?? null,
      price_cents: dto.price_cents,
      member_price_cents: dto.member_price_cents,
      member_ticket_allowance: dto.member_ticket_allowance ?? 2,
      visibility: dto.visibility ?? "public",
      status: dto.status ?? "draft",
      registration_url: dto.registration_url ?? null,
      registration_note: dto.registration_note ?? null,
      confirmation_details: dto.confirmation_details ?? null,
      tags: dto.tags ?? [],
      created_by: createdBy ?? null,
    };

    const { data, error } = await this.supabase.client
      .from("events")
      .insert(payload)
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
    const payload: EventUpdate = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.event_type !== undefined && { event_type: dto.event_type }),
      ...(dto.cover_image_url !== undefined && { cover_image_url: dto.cover_image_url }),
      ...(dto.start_at !== undefined && { start_at: dto.start_at }),
      ...(dto.end_at !== undefined && { end_at: dto.end_at }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.is_online !== undefined && { is_online: dto.is_online }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.price_cents !== undefined && { price_cents: dto.price_cents }),
      ...(dto.member_price_cents !== undefined && { member_price_cents: dto.member_price_cents }),
      ...(dto.member_ticket_allowance !== undefined && { member_ticket_allowance: dto.member_ticket_allowance }),
      ...(dto.visibility !== undefined && { visibility: dto.visibility }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.registration_url !== undefined && { registration_url: dto.registration_url }),
      ...(dto.registration_note !== undefined && { registration_note: dto.registration_note }),
      ...(dto.confirmation_details !== undefined && { confirmation_details: dto.confirmation_details }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
    };

    const { data, error } = await this.supabase.client
      .from("events")
      .update(payload)
      .eq("slug", slug)
      .select()
      .single();

    if (error || !data) throw new NotFoundException(`Event not found: ${slug}`);
    return data;
  }

  async remove(slug: string) {
    const { error } = await this.supabase.client
      .from("events")
      .update({ status: "cancelled" } satisfies EventUpdate)
      .eq("slug", slug);

    if (error) throw error;
    return { success: true };
  }

  // ── Collaborator management ───────────────────────────────────────────────

  async listCollaboratorAccounts() {
    const { data, error } = await this.supabase.client
      .from("profiles")
      .select("id, full_name, avatar_url, bio, public_url")
      .eq("role", "collaborator" as any)
      .order("full_name", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async createOrPromoteCollaborator(
    email: string,
    name?: string,
    linkToEventSlug?: string,
  ) {
    // 1. Find or create Supabase auth user
    let userId: string | null = null;

    const { data: created, error: createError } =
      await this.supabase.client.auth.admin.createUser({
        email,
        user_metadata: name ? { full_name: name } : {},
        email_confirm: true,
      });

    if (created?.user?.id) {
      userId = created.user.id;
    } else if (createError) {
      // User already exists — find them
      const { data: list } = await this.supabase.client.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const existing = list?.users?.find((u) => u.email === email);
      if (existing?.id) userId = existing.id;
    }

    if (!userId) throw new Error(`Could not find or create user: ${email}`);

    // 2. Set role to collaborator (never downgrade superadmin)
    await this.supabase.client
      .from("profiles")
      .update({
        role: "collaborator" as any,
        ...(name ? { full_name: name } : {}),
      })
      .eq("id", userId)
      .not("role", "eq", "superadmin");

    // 3. Optionally link to event
    if (linkToEventSlug) {
      const event = await this.findBySlug(linkToEventSlug);
      await this.supabase.client
        .from("collaborator_events")
        .insert({ collaborator_id: userId, event_id: event.id })
        .throwOnError();
    }

    // 4. Return updated profile
    const { data: profile } = await this.supabase.client
      .from("profiles")
      .select("id, full_name, avatar_url, bio, public_url, role")
      .eq("id", userId)
      .single();

    return profile;
  }

  async getEventCollaborators(slug: string) {
    const event = await this.findBySlug(slug);

    const { data, error } = await this.supabase.client
      .from("collaborator_events")
      .select("collaborator_id, profiles(id, full_name, avatar_url, bio, public_url)")
      .eq("event_id", event.id);

    if (error) throw error;
    return (data ?? []).map((row: any) => row.profiles);
  }

  async addEventCollaborator(slug: string, userId: string) {
    const event = await this.findBySlug(slug);

    const { error } = await this.supabase.client
      .from("collaborator_events")
      .insert({ collaborator_id: userId, event_id: event.id });

    if (error) {
      if (error.code === "23505") return { success: true }; // already linked
      throw error;
    }
    return { success: true };
  }

  async removeEventCollaborator(slug: string, userId: string) {
    const event = await this.findBySlug(slug);

    const { error } = await this.supabase.client
      .from("collaborator_events")
      .delete()
      .eq("event_id", event.id)
      .eq("collaborator_id", userId);

    if (error) throw error;
    return { success: true };
  }
}
