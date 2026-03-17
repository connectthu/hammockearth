import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@hammock/database";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CollaboratorProfileForm } from "@/components/CollaboratorProfileForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collaborator Dashboard — Hammock Earth",
};

export const revalidate = 0;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "short",
    month:   "long",
    day:     "numeric",
    year:    "numeric",
    timeZone: "America/Toronto",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    hour:     "numeric",
    minute:   "2-digit",
    timeZoneName: "short",
    timeZone: "America/Toronto",
  });
}

export default async function CollaboratorDashboardPage() {
  // ── Auth guard ───────────────────────────────────────────────────────────
  const authSupabase = createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) redirect("/members/login?next=/collaborator");

  // ── Role guard ───────────────────────────────────────────────────────────
  const db = createServerClient();

  const { data: profileData } = await db
    .from("profiles")
    .select("full_name, avatar_url, bio, public_url, role")
    .eq("id", user.id)
    .single();
  const profile = profileData as any;

  const role: string = profile?.role ?? "event_customer";
  if (role !== "collaborator" && role !== "superadmin") {
    redirect("/members/dashboard");
  }

  // ── Fetch assigned events ────────────────────────────────────────────────
  const { data: linkRows } = await db
    .from("collaborator_events")
    .select("event_id")
    .eq("collaborator_id", user.id);

  const eventIds = (linkRows as any[])?.map((r) => r.event_id) ?? [];

  let assignedEvents: any[] = [];
  if (eventIds.length > 0) {
    const { data: eventsData } = await db
      .from("events")
      .select("id, slug, title, start_at, end_at, location, cover_image_url, status")
      .in("id", eventIds)
      .order("start_at", { ascending: true });
    assignedEvents = (eventsData as any[]) ?? [];
  }

  const displayName = profile?.full_name ?? user.email ?? "Collaborator";

  return (
    <>
      <Nav />
      <main className="pt-16 min-h-screen bg-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-linen p-6 mb-8">
            <p className="text-xs text-charcoal/40 uppercase tracking-widest font-medium mb-1">
              Collaborator Dashboard
            </p>
            <h1 className="font-serif text-2xl text-soil">{displayName}</h1>
            <span className="inline-flex items-center mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-moss/10 text-moss border border-moss/20">
              {role === "superadmin" ? "Superadmin" : "Collaborator"}
            </span>
          </div>

          <div className="grid lg:grid-cols-[3fr_2fr] gap-8">

            {/* ── Left: Assigned Events ────────────────────────────────── */}
            <div>
              <h2 className="font-serif text-xl text-soil mb-4">Your Events</h2>

              {assignedEvents.length === 0 ? (
                <div className="bg-white rounded-2xl border border-linen p-8 text-center text-charcoal/50">
                  No events assigned yet. An admin will link events to your account.
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedEvents.map((event) => (
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

            {/* ── Right: Profile ───────────────────────────────────────── */}
            <div>
              <h2 className="font-serif text-xl text-soil mb-4">Your Profile</h2>
              <div className="bg-white rounded-2xl border border-linen p-6">
                <p className="text-xs text-charcoal/50 mb-5">
                  This information will appear on event pages where you're listed as a host.
                </p>
                <CollaboratorProfileForm
                  initialProfile={{
                    full_name:  profile?.full_name  ?? "",
                    avatar_url: profile?.avatar_url ?? "",
                    bio:        profile?.bio        ?? "",
                    public_url: profile?.public_url ?? "",
                  }}
                />
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
