import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@hammock/database";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BookingFlow } from "./BookingFlow";

export const revalidate = 60;

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: `Book a session — Hammock Earth` };
}

export default async function ProfilePage({ params }: PageProps) {
  const db = createServerClient();

  // Fetch bookable profile
  const { data: bpData } = await db
    .from("bookable_profiles" as any)
    .select("id, user_id, slug, headline, subheading, is_published, buffer_minutes, cancellation_notice_hours")
    .eq("slug", params.slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!bpData) notFound();
  const bp = bpData as any;

  // Fetch linked member profile
  const { data: profileData } = await db
    .from("profiles")
    .select("full_name, avatar_url, username, location")
    .eq("id", bp.user_id)
    .maybeSingle();

  const profile = (profileData as any) ?? {};

  // Fetch session types
  const { data: sessionTypesData } = await db
    .from("session_types" as any)
    .select("id, name, description, duration_minutes, location_type, location_detail, price_cents, is_free")
    .eq("profile_id", bp.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const sessionTypes = (sessionTypesData ?? []) as any[];

  // Fetch available days of week for calendar highlighting
  const { data: schedulesData } = await db
    .from("availability_schedules" as any)
    .select("day_of_week")
    .eq("profile_id", bp.id);

  const availabilityDays = [
    ...new Set(((schedulesData ?? []) as any[]).map((s) => s.day_of_week as number)),
  ];

  return (
    <>
      <Nav />
      <div className="pt-16 min-h-screen bg-cream">
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* ── Profile header ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl border border-linen p-8 mb-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url as string}
                    alt={profile.full_name ?? bp.slug}
                    className="w-36 h-36 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-2xl bg-linen flex items-center justify-center text-5xl">
                    🌿
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="font-serif text-3xl text-soil leading-tight mb-1">
                  {profile.full_name ?? bp.slug}
                </h1>
                {profile.username && (
                  <p className="text-charcoal/50 text-sm mb-2">@{profile.username as string}</p>
                )}
                {bp.headline && (
                  <p className="text-charcoal/70 text-sm italic mb-3 leading-relaxed">{bp.headline}</p>
                )}
                {profile.location && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs text-charcoal/50 border border-linen">
                    📍 {profile.location as string}
                  </span>
                )}
              </div>
            </div>

            {bp.subheading && (
              <p className="text-charcoal/60 text-sm mt-5 pt-5 border-t border-linen leading-relaxed">
                {bp.subheading}
              </p>
            )}
          </div>

          {/* ── Book a session ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl border border-linen p-8 mb-6">
            <h2 className="font-serif text-xl text-soil mb-6">Book a Session</h2>
            <BookingFlow
              slug={bp.slug}
              sessionTypes={sessionTypes}
              availabilityDays={availabilityDays}
              cancellationNoticeHours={bp.cancellation_notice_hours}
            />
          </div>

        </main>
      </div>
      <Footer />
    </>
  );
}
