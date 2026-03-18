import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import type { CreateContentDto } from "./dto/create-content.dto";
import type { UpdateContentDto } from "./dto/update-content.dto";
import type { CreateCommentDto } from "./dto/create-comment.dto";

type AccessLevel = "guest" | "registered" | "member" | "collaborator" | "admin";

@Injectable()
export class ContentLibraryService {
  private readonly logger = new Logger(ContentLibraryService.name);

  constructor(private supabase: SupabaseService) {}

  // ── Auth helpers ────────────────────────────────────────────────────────────

  async getUserIdFromToken(authHeader?: string): Promise<string | null> {
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    try {
      const { data: { user } } = await this.supabase.client.auth.getUser(token);
      return user?.id ?? null;
    } catch {
      return null;
    }
  }

  async getUserAccessLevels(userId: string | null): Promise<AccessLevel[]> {
    const levels: AccessLevel[] = ["guest"];
    if (!userId) return levels;

    levels.push("registered");

    const { data: profile } = await this.supabase.client
      .from("profiles")
      .select("role, membership_type, membership_status")
      .eq("id", userId)
      .single();

    if (!profile) return levels;
    const p = profile as any;

    if (
      ["farm_friend", "season_pass", "try_a_month"].includes(p.membership_type) &&
      p.membership_status === "active"
    ) {
      levels.push("member");
    }

    if (p.role === "collaborator" || p.role === "superadmin") {
      levels.push("collaborator");
    }

    if (p.role === "superadmin") {
      levels.push("admin");
    }

    return levels;
  }

  canAccess(visibleTo: string[], levels: AccessLevel[]): boolean {
    return visibleTo.some((v) => levels.includes(v as AccessLevel));
  }

  // ── Public endpoints ────────────────────────────────────────────────────────

  async listPublished(opts: {
    userId: string | null;
    contentType?: string;
    topic?: string;
  }) {
    const levels = await this.getUserAccessLevels(opts.userId);

    let query = this.supabase.client
      .from("content_library" as any)
      .select(
        "id,slug,title,summary,cover_image_url,content_type,topics,visible_to,is_featured,heart_count,read_time_minutes,watch_listen_minutes,published_at"
      )
      .not("published_at", "is", null)
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false });

    if (opts.contentType) {
      query = query.eq("content_type", opts.contentType);
    }
    if (opts.topic) {
      query = query.contains("topics", [opts.topic]);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((item: any) => ({
      ...item,
      locked: !this.canAccess(item.visible_to ?? [], levels),
    }));
  }

  async getBySlug(slug: string, userId: string | null) {
    const levels = await this.getUserAccessLevels(userId);

    const { data, error } = await this.supabase.client
      .from("content_library" as any)
      .select("*")
      .eq("slug", slug)
      .not("published_at", "is", null)
      .single();

    if (error || !data) throw new NotFoundException("Content not found");

    const item = data as any;
    const locked = !this.canAccess(item.visible_to ?? [], levels);

    if (locked) {
      // Return teaser — title, summary, cover, heart_count visible; body/media gated
      return {
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary,
        cover_image_url: item.cover_image_url,
        content_type: item.content_type,
        topics: item.topics,
        visible_to: item.visible_to,
        heart_count: item.heart_count,
        read_time_minutes: item.read_time_minutes,
        watch_listen_minutes: item.watch_listen_minutes,
        published_at: item.published_at,
        locked: true,
        body: null,
        media_url: null,
        media_kind: null,
      };
    }

    // Return user's heart status if logged in
    let hearted = false;
    if (userId) {
      const { data: heartRow } = await this.supabase.client
        .from("content_hearts" as any)
        .select("id")
        .eq("content_id", item.id)
        .eq("user_id", userId)
        .single();
      hearted = !!heartRow;
    }

    return { ...item, locked: false, hearted };
  }

  // ── Hearts ──────────────────────────────────────────────────────────────────

  async toggleHeart(contentId: string, userId: string) {
    // Verify content exists
    const { data: content } = await this.supabase.client
      .from("content_library" as any)
      .select("id, heart_count, visible_to")
      .eq("id", contentId)
      .single();

    if (!content) throw new NotFoundException("Content not found");

    const levels = await this.getUserAccessLevels(userId);
    if (!levels.includes("member") && !levels.includes("admin")) {
      throw new ForbiddenException("Membership required to heart content");
    }

    const item = content as any;

    // Check if already hearted
    const { data: existing } = await this.supabase.client
      .from("content_hearts" as any)
      .select("id")
      .eq("content_id", contentId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Remove heart
      await this.supabase.client
        .from("content_hearts" as any)
        .delete()
        .eq("content_id", contentId)
        .eq("user_id", userId);

      const newCount = Math.max(0, item.heart_count - 1);
      await this.supabase.client
        .from("content_library" as any)
        .update({ heart_count: newCount })
        .eq("id", contentId);

      return { hearted: false, heartCount: newCount };
    } else {
      // Add heart
      await this.supabase.client
        .from("content_hearts" as any)
        .insert({ content_id: contentId, user_id: userId });

      const newCount = item.heart_count + 1;
      await this.supabase.client
        .from("content_library" as any)
        .update({ heart_count: newCount })
        .eq("id", contentId);

      return { hearted: true, heartCount: newCount };
    }
  }

  // ── Comments ────────────────────────────────────────────────────────────────

  async getComments(contentId: string, userId: string) {
    const levels = await this.getUserAccessLevels(userId);
    if (!levels.includes("member") && !levels.includes("admin")) {
      throw new ForbiddenException("Membership required to view comments");
    }

    const { data, error } = await this.supabase.client
      .from("content_comments" as any)
      .select("id, content_id, user_id, body, created_at, updated_at, profiles(full_name, avatar_url, username)")
      .eq("content_id", contentId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  }

  async addComment(contentId: string, userId: string, dto: CreateCommentDto) {
    if (!dto.body?.trim()) throw new BadRequestException("Comment body is required");

    const levels = await this.getUserAccessLevels(userId);
    if (!levels.includes("member") && !levels.includes("admin")) {
      throw new ForbiddenException("Membership required to comment");
    }

    const { data, error } = await this.supabase.client
      .from("content_comments" as any)
      .insert({ content_id: contentId, user_id: userId, body: dto.body.trim() })
      .select("id, content_id, user_id, body, created_at, updated_at, profiles(full_name, avatar_url, username)")
      .single();

    if (error) throw error;
    return data;
  }

  async deleteComment(commentId: string, userId: string) {
    const { data: comment } = await this.supabase.client
      .from("content_comments" as any)
      .select("id, user_id")
      .eq("id", commentId)
      .single();

    if (!comment) throw new NotFoundException("Comment not found");

    const levels = await this.getUserAccessLevels(userId);
    const isOwner = (comment as any).user_id === userId;
    const isAdmin = levels.includes("admin");

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException("Cannot delete another member's comment");
    }

    await this.supabase.client
      .from("content_comments" as any)
      .delete()
      .eq("id", commentId);

    return { success: true };
  }

  // ── Admin CRUD ──────────────────────────────────────────────────────────────

  async listAll() {
    const { data, error } = await this.supabase.client
      .from("content_library" as any)
      .select("id,slug,title,content_type,topics,visible_to,is_featured,heart_count,published_at,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async getById(id: string) {
    const { data, error } = await this.supabase.client
      .from("content_library" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundException("Content not found");
    return data;
  }

  async create(dto: CreateContentDto) {
    // If setting featured, unset others first
    if (dto.is_featured) {
      await this.supabase.client
        .from("content_library" as any)
        .update({ is_featured: false })
        .eq("is_featured", true);
    }

    const { data, error } = await this.supabase.client
      .from("content_library" as any)
      .insert({
        title: dto.title,
        slug: dto.slug,
        summary: dto.summary ?? null,
        body: dto.body ?? null,
        cover_image_url: dto.cover_image_url ?? null,
        content_type: dto.content_type,
        media_url: dto.media_url ?? null,
        media_kind: dto.media_kind ?? null,
        topics: dto.topics ?? [],
        visible_to: dto.visible_to ?? ["public"],
        is_featured: dto.is_featured ?? false,
        read_time_minutes: dto.read_time_minutes ?? null,
        watch_listen_minutes: dto.watch_listen_minutes ?? null,
        published_at: dto.published_at ?? null,
        created_by: null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, dto: UpdateContentDto) {
    // If setting featured, unset others first
    if (dto.is_featured) {
      await this.supabase.client
        .from("content_library" as any)
        .update({ is_featured: false })
        .eq("is_featured", true)
        .neq("id", id);
    }

    const update: Record<string, unknown> = {};
    const fields: (keyof UpdateContentDto)[] = [
      "title", "slug", "summary", "body", "cover_image_url", "content_type",
      "media_url", "media_kind", "topics", "visible_to", "is_featured",
      "read_time_minutes", "watch_listen_minutes", "published_at",
    ];

    for (const f of fields) {
      if (dto[f] !== undefined) update[f] = dto[f] as unknown;
    }

    const { data, error } = await this.supabase.client
      .from("content_library" as any)
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.client
      .from("content_library" as any)
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  }
}
