import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@hammock/database";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import CancelButtonClient from "./CancelButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member Dashboard — Hammock Earth",
};

export const revalidate = 0;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Toronto",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "America/Toronto",
  });
}

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `CA$${(cents / 100).toFixed(2)}`;
}

const MEMBERSHIP_LABELS: Record<string, string> = {
  season_pass: "Seasons Pass",
  farm_friend: "Farm Friend",
  try_a_month: "Try a Month",
  community_partner: "Community Partner",
};

export default async function MemberDashboardPage() {
  // Auth check via SSR client with cookie session
  const authSupabase = createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/members/login?next=/members/dashboard");
  }

  // Data client (service role) for fetching events & membership
  const db = createServerClient();

  // Fetch profile
  const { data: profileData } = await db
    .from("profiles")
    .select("full_name, membership_type, membership_status, role, onboarding_complete")
    .eq("id", user.id)
    .single();
  const profile = profileData as any;

  // Fetch active membership
  const { data: membershipData } = await db
    .from("memberships")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active" as any)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const membership = membershipData as any;

  // Onboarding redirect — only for members who haven't completed onboarding
  if (membership && profile?.onboarding_complete === false) {
    redirect("/onboarding");
  }

  // Fetch upcoming published events
  const { data: eventsData } = await db
    .from("events")
    .select("id, slug, title, start_at, end_at, location, price_cents, member_price_cents, visibility, cover_image_url")
    .eq("status", "published")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(20);
  const events = (eventsData as any[]) ?? [];

  // Fetch collaborator-assigned events (for collaborators and superadmins)
  const role: string = profile?.role ?? "event_customer";
  const isCollaborator = role === "collaborator" || role === "superadmin";
  let assignedEvents: any[] = [];

  if (isCollaborator) {
    const { data: linkRows } = await db
      .from("collaborator_events")
      .select("event_id")
      .eq("collaborator_id", user.id);

    const eventIds = (linkRows as any[])?.map((r) => r.event_id) ?? [];
    if (eventIds.length > 0) {
      const { data: eventsAssigned } = await db
        .from("events")
        .select("id, slug, title, start_at, end_at, location, cover_image_url, status")
        .in("id", eventIds)
        .order("start_at", { ascending: true });
      assignedEvents = (eventsAssigned as any[]) ?? [];
    }
  }

  const displayName =
    profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Member";
  const membershipLabel =
    membership?.membership_type
      ? MEMBERSHIP_LABELS[membership.membership_type] ?? membership.membership_type
      : null;

  const isFarmFriend = membership?.membership_type === "farm_friend";
  const isSeasonPass = membership?.membership_type === "season_pass";

  return (
    <>
      <Nav />
      <main className="pt-16 min-h-screen bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-linen p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-charcoal/40 uppercase tracking-widest font-medium mb-1">
                Welcome back
              </p>
              <h1 className="font-serif text-2xl text-soil">{displayName}</h1>
              {membershipLabel && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-clay/10 text-clay border border-clay/20">
                    {membershipLabel}
                  </span>
                  {membership?.status === "active" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Edit Profile link */}
              <Link
                href="/members/profile/edit"
                className="text-sm font-medium text-clay hover:underline"
              >
                Edit Profile
              </Link>

              {/* Membership details */}
              {membership && (
                <div className="text-right text-sm">
                  {isSeasonPass && membership.valid_until && (
                    <p className="text-charcoal/60">
                      Valid until{" "}
                      <strong className="text-soil">
                        {new Date(membership.valid_until).toLocaleDateString("en-CA", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </strong>
                    </p>
                  )}
                  {isFarmFriend && (
                    <p className="text-charcoal/60">$10/month · Renews automatically</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
            <div className="space-y-8">
              {/* ── Collaborator Events ───────────────────────────────────── */}
              {isCollaborator && (
                <div>
                  <h2 className="font-serif text-xl text-soil mb-4">Your Events</h2>

                  {assignedEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-linen p-8 text-center text-charcoal/50">
                      No events assigned yet. An admin will link events to your account.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignedEvents.map((event: any) => (
                        <Link
                          key={event.id}
                          href={`/events/${event.slug}`}
                          className="block bg-white rounded-2xl border border-linen p-5 hover:border-clay/30 transition-colors group"
                        >
                          <div className="flex gap-4">
                            {event.cover_image_url ? (
                              <img
                                src={event.cover_image_url}
                                alt={event.title}
                                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-linen flex items-center justify-center flex-shrink-0 text-2xl">
                                🌿
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-medium text-soil group-hover:text-clay transition-colors leading-snug">
                                  {event.title}
                                </h3>
                                <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  event.status === "published"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-linen text-charcoal/50"
                                }`}>
                                  {event.status}
                                </span>
                              </div>
                              <p className="text-xs text-charcoal/50 mb-0.5">
                                {formatDate(event.start_at)} · {formatTime(event.start_at)}
                              </p>
                              <p className="text-xs text-charcoal/50">{event.location}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Upcoming Events ──────────────────────────────────────────── */}
              <div>
                <h2 className="font-serif text-xl text-soil mb-4">
                  Upcoming Events
                </h2>

                {events.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-linen p-8 text-center text-charcoal/50">
                    No upcoming events right now. Check back soon.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((event: any) => {
                      const isMembersOnly = event.visibility === "members_only";
                      return (
                        <Link
                          key={event.id}
                          href={`/events/${event.slug}`}
                          className="block bg-white rounded-2xl border border-linen p-5 hover:border-clay/30 transition-colors group"
                        >
                          <div className="flex gap-4">
                            {event.cover_image_url ? (
                              <img
                                src={event.cover_image_url}
                                alt={event.title}
                                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-linen flex items-center justify-center flex-shrink-0 text-2xl">
                                🌿
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-medium text-soil group-hover:text-clay transition-colors leading-snug">
                                  {event.title}
                                </h3>
                                {isMembersOnly && (
                                  <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-clay/10 text-clay border border-clay/20">
                                    Members Only
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-charcoal/50 mb-1">
                                {formatDate(event.start_at)} · {formatTime(event.start_at)}
                              </p>
                              <p className="text-xs text-charcoal/50 mb-2">
                                {event.location}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-soil">
                                  {formatPrice(event.price_cents)}
                                </span>
                                {event.member_price_cents !== null &&
                                  event.member_price_cents < event.price_cents && (
                                    <span className="text-xs text-moss font-medium">
                                      Members: {formatPrice(event.member_price_cents)}
                                    </span>
                                  )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <div className="space-y-4">
              {/* Membership management */}
              {membership && (
                <div className="bg-white rounded-2xl border border-linen p-5">
                  <h3 className="font-medium text-soil mb-3 text-sm">
                    Your Membership
                  </h3>
                  <div className="space-y-2 text-sm text-charcoal/70">
                    <div className="flex justify-between">
                      <span>Type</span>
                      <span className="font-medium text-soil">
                        {membershipLabel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status</span>
                      <span className="font-medium text-soil capitalize">
                        {membership.status}
                      </span>
                    </div>
                    {isSeasonPass && membership.valid_until && (
                      <div className="flex justify-between">
                        <span>Valid until</span>
                        <span className="font-medium text-soil">
                          Dec 31, 2026
                        </span>
                      </div>
                    )}
                    {isFarmFriend && (
                      <div className="flex justify-between">
                        <span>Billing</span>
                        <span className="font-medium text-soil">$10/month</span>
                      </div>
                    )}
                  </div>

                  {isFarmFriend && membership.status === "active" && (
                    <CancelButtonClient />
                  )}
                </div>
              )}

              {/* No membership */}
              {!membership && (
                <div className="bg-linen rounded-2xl border border-linen p-5 text-center">
                  <p className="text-sm text-charcoal/60 mb-4">
                    You don't have an active membership.
                  </p>
                  <a
                    href="/members"
                    className="inline-block text-sm font-medium text-clay hover:underline"
                  >
                    Explore membership options →
                  </a>
                </div>
              )}

              {/* Content library placeholder */}
              <div className="bg-linen rounded-2xl border border-linen p-5 text-center opacity-60">
                <div className="text-2xl mb-2">📚</div>
                <p className="text-sm font-medium text-soil mb-1">
                  Recipe Library
                </p>
                <p className="text-xs text-charcoal/50">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
