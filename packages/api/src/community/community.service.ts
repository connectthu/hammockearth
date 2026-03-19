import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { EmailService } from "../email/email.service";
import { CreateShoutoutDto } from "./dto/create-shoutout.dto";
import { CreateAskDto } from "./dto/create-ask.dto";

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    private supabase: SupabaseService,
    private email: EmailService,
  ) {}

  // ── Auth helpers ─────────────────────────────────────────────────────────────

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

  async requireMember(userId: string): Promise<void> {
    const { data: profile } = await this.supabase.client
      .from("profiles" as any)
      .select("role, membership_type, membership_status")
      .eq("id", userId)
      .single();

    const p = profile as any;
    const ok =
      p?.role !== "genpop" ||
      (["farm_friend", "season_pass", "try_a_month"].includes(p?.membership_type) &&
        p?.membership_status === "active");
    if (!ok) throw new ForbiddenException("Active membership required");
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.client.auth.admin.getUserById(userId);
      return user?.email ?? null;
    } catch {
      return null;
    }
  }

  // ── Shoutouts ────────────────────────────────────────────────────────────────

  async listShoutouts(userId: string, cursor?: string) {
    await this.requireMember(userId);

    let query = this.supabase.client
      .from("community_shoutouts" as any)
      .select("id, body, heart_count, created_at, user_id, profiles(full_name, avatar_url, username)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = (data ?? []) as any[];
    const ids = items.map((i: any) => i.id);

    let heartedIds: string[] = [];
    if (ids.length > 0) {
      const { data: hearts } = await this.supabase.client
        .from("shoutout_hearts" as any)
        .select("shoutout_id")
        .eq("user_id", userId)
        .in("shoutout_id", ids);
      heartedIds = ((hearts ?? []) as any[]).map((h: any) => h.shoutout_id);
    }

    return items.map((item: any) => ({
      ...item,
      hearted: heartedIds.includes(item.id),
    }));
  }

  async createShoutout(userId: string, dto: CreateShoutoutDto) {
    await this.requireMember(userId);

    const { data, error } = await this.supabase.client
      .from("community_shoutouts" as any)
      .insert({ user_id: userId, body: dto.body })
      .select("id, body, heart_count, created_at, user_id, profiles(full_name, avatar_url, username)")
      .single();

    if (error) throw error;
    return { ...(data as any), hearted: false };
  }

  async toggleShoutoutHeart(shoutoutId: string, userId: string) {
    await this.requireMember(userId);

    const { data: shoutout } = await this.supabase.client
      .from("community_shoutouts" as any)
      .select("id, heart_count")
      .eq("id", shoutoutId)
      .single();

    if (!shoutout) throw new NotFoundException("Shoutout not found");
    const item = shoutout as any;

    const { data: existing } = await this.supabase.client
      .from("shoutout_hearts" as any)
      .select("id")
      .eq("shoutout_id", shoutoutId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      await this.supabase.client
        .from("shoutout_hearts" as any)
        .delete()
        .eq("shoutout_id", shoutoutId)
        .eq("user_id", userId);

      const newCount = Math.max(0, item.heart_count - 1);
      await this.supabase.client
        .from("community_shoutouts" as any)
        .update({ heart_count: newCount })
        .eq("id", shoutoutId);

      return { hearted: false, heartCount: newCount };
    } else {
      await this.supabase.client
        .from("shoutout_hearts" as any)
        .insert({ shoutout_id: shoutoutId, user_id: userId });

      const newCount = item.heart_count + 1;
      await this.supabase.client
        .from("community_shoutouts" as any)
        .update({ heart_count: newCount })
        .eq("id", shoutoutId);

      return { hearted: true, heartCount: newCount };
    }
  }

  async deleteShoutout(shoutoutId: string, userId: string, isAdmin: boolean) {
    if (!isAdmin) {
      const { data } = await this.supabase.client
        .from("community_shoutouts" as any)
        .select("user_id")
        .eq("id", shoutoutId)
        .single();
      if (!data || (data as any).user_id !== userId) throw new ForbiddenException();
    }
    const { error } = await this.supabase.client
      .from("community_shoutouts" as any)
      .delete()
      .eq("id", shoutoutId);
    if (error) throw error;
    return { success: true };
  }

  // ── Asks ─────────────────────────────────────────────────────────────────────

  async listAsks(userId: string, opts: { category?: string; status?: string }) {
    await this.requireMember(userId);

    let query = this.supabase.client
      .from("community_asks" as any)
      .select("id, category, title, body, supported_count, status, created_at, user_id, profiles(full_name, avatar_url, username)")
      .order("created_at", { ascending: false });

    if (opts.category) query = query.eq("category", opts.category);
    if (opts.status) query = query.eq("status", opts.status);

    const { data, error } = await query;
    if (error) throw error;

    const items = (data ?? []) as any[];
    const ids = items.map((i: any) => i.id);

    let supportedIds: string[] = [];
    if (ids.length > 0) {
      const { data: supporters } = await this.supabase.client
        .from("ask_supporters" as any)
        .select("ask_id")
        .eq("user_id", userId)
        .in("ask_id", ids);
      supportedIds = ((supporters ?? []) as any[]).map((s: any) => s.ask_id);
    }

    return items.map((item: any) => ({
      ...item,
      supported: supportedIds.includes(item.id),
      isOwner: item.user_id === userId,
    }));
  }

  async createAsk(userId: string, dto: CreateAskDto) {
    await this.requireMember(userId);

    const { data, error } = await this.supabase.client
      .from("community_asks" as any)
      .insert({
        user_id: userId,
        category: dto.category,
        title: dto.title,
        body: dto.body,
      })
      .select("id, category, title, body, supported_count, status, created_at, user_id, profiles(full_name, avatar_url, username)")
      .single();

    if (error) throw error;
    return { ...(data as any), supported: false, isOwner: true };
  }

  async supportAsk(askId: string, helperId: string) {
    await this.requireMember(helperId);

    const { data: ask } = await this.supabase.client
      .from("community_asks" as any)
      .select("id, title, user_id, supported_count, status")
      .eq("id", askId)
      .single();

    if (!ask) throw new NotFoundException("Ask not found");
    const askRow = ask as any;
    if (askRow.status === "closed") throw new ForbiddenException("This ask is already closed");
    if (askRow.user_id === helperId) throw new ForbiddenException("You cannot support your own ask");

    // Idempotency check
    const { data: existing } = await this.supabase.client
      .from("ask_supporters" as any)
      .select("id")
      .eq("ask_id", askId)
      .eq("user_id", helperId)
      .single();

    if (existing) throw new ConflictException("You have already offered to help with this ask");

    // Record support
    await this.supabase.client
      .from("ask_supporters" as any)
      .insert({ ask_id: askId, user_id: helperId });

    const newCount = askRow.supported_count + 1;
    await this.supabase.client
      .from("community_asks" as any)
      .update({ supported_count: newCount })
      .eq("id", askId);

    // Send connection emails (non-blocking)
    this.sendConnectionEmails(askRow, helperId).catch((err) =>
      this.logger.error("Failed to send community ask connection emails", err)
    );

    return { success: true, supportedCount: newCount };
  }

  private async sendConnectionEmails(ask: any, helperId: string): Promise<void> {
    const [posterEmail, helperEmail] = await Promise.all([
      this.getUserEmail(ask.user_id),
      this.getUserEmail(helperId),
    ]);

    const [posterProfile, helperProfile] = await Promise.all([
      this.supabase.client.from("profiles" as any).select("full_name").eq("id", ask.user_id).single(),
      this.supabase.client.from("profiles" as any).select("full_name").eq("id", helperId).single(),
    ]);

    const posterName = (posterProfile.data as any)?.full_name?.split(" ")[0] ?? "there";
    const helperName = (helperProfile.data as any)?.full_name?.split(" ")[0] ?? "a member";

    if (posterEmail) {
      await this.email.communityAskConnection({
        templateKey: "community_ask_poster",
        to: posterEmail,
        vars: {
          poster_name: posterName,
          helper_name: helperName,
          helper_email: helperEmail ?? "(email unavailable)",
          ask_title: ask.title,
        },
      });
    }

    if (helperEmail) {
      await this.email.communityAskConnection({
        templateKey: "community_ask_helper",
        to: helperEmail,
        vars: {
          poster_name: posterName,
          poster_email: posterEmail ?? "(email unavailable)",
          ask_title: ask.title,
        },
      });
    }
  }

  async closeAsk(askId: string, userId: string) {
    const { data: ask } = await this.supabase.client
      .from("community_asks" as any)
      .select("user_id")
      .eq("id", askId)
      .single();

    if (!ask) throw new NotFoundException("Ask not found");
    if ((ask as any).user_id !== userId) throw new ForbiddenException("Only the poster can close this ask");

    const { data, error } = await this.supabase.client
      .from("community_asks" as any)
      .update({ status: "closed" })
      .eq("id", askId)
      .select("id, status")
      .single();

    if (error) throw error;
    return data;
  }

  async deleteAsk(askId: string, userId: string, isAdmin: boolean) {
    if (!isAdmin) {
      const { data } = await this.supabase.client
        .from("community_asks" as any)
        .select("user_id")
        .eq("id", askId)
        .single();
      if (!data || (data as any).user_id !== userId) throw new ForbiddenException();
    }
    const { error } = await this.supabase.client
      .from("community_asks" as any)
      .delete()
      .eq("id", askId);
    if (error) throw error;
    return { success: true };
  }

  // ── Admin ─────────────────────────────────────────────────────────────────────

  async adminListShoutouts() {
    const { data, error } = await this.supabase.client
      .from("community_shoutouts" as any)
      .select("id, body, heart_count, created_at, user_id, profiles(full_name, username)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async adminListAsks() {
    const { data, error } = await this.supabase.client
      .from("community_asks" as any)
      .select("id, category, title, body, supported_count, status, created_at, user_id, profiles(full_name, username)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
}
