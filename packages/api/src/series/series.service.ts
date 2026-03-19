import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CreateSeriesDto } from "./dto/create-series.dto";
import type { UpdateSeriesDto } from "./dto/update-series.dto";
import type { UpdateSeriesSessionDto } from "./dto/update-series-session.dto";
import type { EventSeries, EventSeriesSession } from "@hammock/database";

@Injectable()
export class SeriesService {
  constructor(private supabase: SupabaseService) {}

  async findAll(includeUnpublished = false) {
    let query = this.supabase.client
      .from("event_series")
      .select("*, event_series_sessions(start_at, session_number)")
      .order("created_at", { ascending: false });

    if (!includeUnpublished) {
      query = query.eq("status", "published").eq("visibility", "public");
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async findBySlug(slug: string) {
    const { data: seriesData, error: seriesError } = await this.supabase.client
      .from("event_series")
      .select("*")
      .eq("slug", slug)
      .limit(1);

    if (seriesError || !seriesData || seriesData.length === 0) {
      throw new NotFoundException(`Series not found: ${slug}`);
    }

    const series = seriesData[0] as unknown as EventSeries;

    const { data: sessionsData, error: sessionsError } =
      await this.supabase.client
        .from("event_series_sessions")
        .select("*")
        .eq("series_id", series.id)
        .order("session_number", { ascending: true });

    if (sessionsError) throw sessionsError;

    return {
      ...series,
      sessions: (sessionsData ?? []) as unknown as EventSeriesSession[],
    };
  }

  async findById(id: string) {
    const { data, error } = await this.supabase.client
      .from("event_series")
      .select("*")
      .eq("id", id)
      .limit(1);

    if (error || !data || data.length === 0) {
      throw new NotFoundException(`Series not found: ${id}`);
    }
    return data[0] as unknown as EventSeries;
  }

  async create(dto: CreateSeriesDto) {
    const { data: seriesData, error: seriesError } =
      await this.supabase.client
        .from("event_series")
        .insert({
          title: dto.title,
          slug: dto.slug,
          description: dto.description ?? null,
          cover_image_url: dto.coverImageUrl ?? null,
          is_online: dto.isOnline ?? true,
          location: dto.location ?? null,
          duration_weeks: dto.durationWeeks,
          session_count: dto.sessionCount,
          price_cents: dto.priceCents,
          member_price_cents: dto.memberPriceCents,
          drop_in_enabled: dto.dropInEnabled ?? false,
          drop_in_price_cents: dto.dropInPriceCents ?? null,
          drop_in_member_price_cents: dto.dropInMemberPriceCents ?? null,
          visibility: dto.visibility ?? "public",
          status: dto.status ?? "draft",
          tags: dto.tags ?? [],
        })
        .select()
        .single();

    if (seriesError) {
      if (seriesError.code === "23505") {
        throw new ConflictException(`Slug "${dto.slug}" already exists`);
      }
      throw seriesError;
    }

    const series = seriesData as unknown as EventSeries;
    const durationMinutes = dto.sessionDurationMinutes ?? 90;
    const firstStart = new Date(dto.firstSessionAt);

    const frequencyDays =
      dto.sessionFrequency === "biweekly" ? 14
      : dto.sessionFrequency === "monthly" ? 28
      : 7; // weekly default

    const sessions = Array.from({ length: dto.sessionCount }, (_, i) => {
      const startAt = new Date(
        firstStart.getTime() + i * frequencyDays * 24 * 60 * 60 * 1000
      );
      const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
      return {
        series_id: series.id,
        session_number: i + 1,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        title: null,
        location: dto.location ?? null,
        meeting_url: null,
        capacity: null,
        status: "scheduled" as const,
      };
    });

    const { error: sessionsError } = await this.supabase.client
      .from("event_series_sessions")
      .insert(sessions);

    if (sessionsError) throw sessionsError;

    return this.findBySlug(dto.slug);
  }

  async update(id: string, dto: UpdateSeriesDto) {
    const payload: Record<string, unknown> = {};
    if (dto.title !== undefined) payload.title = dto.title;
    if (dto.slug !== undefined) payload.slug = dto.slug;
    if (dto.description !== undefined) payload.description = dto.description;
    if (dto.coverImageUrl !== undefined)
      payload.cover_image_url = dto.coverImageUrl;
    if (dto.isOnline !== undefined) payload.is_online = dto.isOnline;
    if (dto.location !== undefined) payload.location = dto.location;
    if (dto.priceCents !== undefined) payload.price_cents = dto.priceCents;
    if (dto.memberPriceCents !== undefined)
      payload.member_price_cents = dto.memberPriceCents;
    if (dto.dropInEnabled !== undefined)
      payload.drop_in_enabled = dto.dropInEnabled;
    if (dto.dropInPriceCents !== undefined)
      payload.drop_in_price_cents = dto.dropInPriceCents;
    if (dto.dropInMemberPriceCents !== undefined)
      payload.drop_in_member_price_cents = dto.dropInMemberPriceCents;
    if (dto.visibility !== undefined) payload.visibility = dto.visibility;
    if (dto.status !== undefined) payload.status = dto.status;
    if (dto.tags !== undefined) payload.tags = dto.tags;

    const { data, error } = await this.supabase.client
      .from("event_series")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) throw new NotFoundException(`Series not found: ${id}`);
    return data as unknown as EventSeries;
  }

  async updateSession(
    seriesId: string,
    sessionId: string,
    dto: UpdateSeriesSessionDto
  ) {
    const payload: Record<string, unknown> = {};
    if (dto.title !== undefined) payload.title = dto.title;
    if (dto.startAt !== undefined) payload.start_at = dto.startAt;
    if (dto.endAt !== undefined) payload.end_at = dto.endAt;
    if (dto.meetingUrl !== undefined) payload.meeting_url = dto.meetingUrl;
    if (dto.location !== undefined) payload.location = dto.location;
    if (dto.status !== undefined) payload.status = dto.status;

    const { data, error } = await this.supabase.client
      .from("event_series_sessions")
      .update(payload)
      .eq("id", sessionId)
      .eq("series_id", seriesId)
      .select()
      .single();

    if (error || !data)
      throw new NotFoundException(`Session not found: ${sessionId}`);
    return data as unknown as EventSeriesSession;
  }

  async remove(id: string) {
    const { error } = await this.supabase.client
      .from("event_series")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  }

  // ── Video access grants ───────────────────────────────────────────────────

  async searchUsersForGrant(query: string) {
    const q = query.trim();
    if (!q) return [];

    const { data: profileRows } = await this.supabase.client
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .ilike("full_name", `%${q}%`)
      .limit(10);

    const { data: { users } } =
      await this.supabase.client.auth.admin.listUsers({ perPage: 10000 });
    const emailById = new Map(users.map((u) => [u.id, u.email ?? ""]));

    let emailMatchId: string | null = null;
    if (q.includes("@")) {
      const match = users.find((u) => u.email === q);
      if (match) emailMatchId = match.id;
    }

    let rows = [...(profileRows ?? [])] as any[];
    if (emailMatchId && !rows.find((r) => r.id === emailMatchId)) {
      const { data: extra } = await this.supabase.client
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("id", emailMatchId)
        .single();
      if (extra) rows.push(extra);
    }

    return rows.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      avatar_url: p.avatar_url,
      email: emailById.get(p.id) ?? "",
    }));
  }

  async listSeriesAccessGrants(seriesId: string) {
    const { data: grants } = await this.supabase.client
      .from("series_video_access_grants" as any)
      .select("id, user_id, note, created_at")
      .eq("series_id", seriesId)
      .order("created_at", { ascending: false });

    if (!grants || grants.length === 0) return [];

    const userIds = (grants as any[]).map((g) => g.user_id);
    const { data: profiles } = await this.supabase.client
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    const { data: { users } } =
      await this.supabase.client.auth.admin.listUsers({ perPage: 10000 });
    const emailById = new Map(users.map((u) => [u.id, u.email ?? ""]));
    const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return (grants as any[]).map((g) => {
      const profile = profileById.get(g.user_id);
      return {
        id: g.id,
        user_id: g.user_id,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        email: emailById.get(g.user_id) ?? "",
        note: g.note ?? null,
        created_at: g.created_at,
      };
    });
  }

  async grantSeriesAccess(seriesId: string, userId: string, note?: string) {
    const { data, error } = await this.supabase.client
      .from("series_video_access_grants" as any)
      .insert({ series_id: seriesId, user_id: userId, note: note ?? null })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new ConflictException("User already has access");
      throw error;
    }
    return data;
  }

  async revokeSeriesAccess(seriesId: string, userId: string) {
    const { error } = await this.supabase.client
      .from("series_video_access_grants" as any)
      .delete()
      .eq("series_id", seriesId)
      .eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  }
}
