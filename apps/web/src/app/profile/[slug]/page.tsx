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

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  website: "Website",
  substack: "Substack",
  other: "Link",
};

const MEMBERSHIP_LABELS: Record<string, string> = {
  season_pass: "Season Pass",
  farm_friend: "Farm Friend",
  try_a_month: "Try a Month",
  community_partner: "Community Partner",
};

export default async function ProfilePage({ params }: PageProps) {
  const db = createServerClient();

  // Fetch bookable profile
  const { data: bpData } = await db
    .from("bookable_profiles" as any)
    .select("id, user_id, slug, headline, subheading, about, is_published, buffer_minutes, cancellation_notice_hours")
    .eq("slug", params.slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!bpData) notFound();
  const bp = bpData as any;

  // Fetch linked member profile
  const { data: profileData } = await db
    .from("profiles")
    .select("id, full_name, avatar_url, bio, username, location, social_links, membership_type, role")
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

  // Fetch superpowers + offerings
  const [superpowersRes, offeringsRes] = await Promise.all([
    db.from("profile_superpowers").select("superpowers(id, label)").eq("profile_id", bp.user_id),
    db.from("offerings").select("id, title, description, icon").eq("profile_id", bp.user_id).order("display_order"),
  ]);

  const superpowers = ((superpowersRes.data as any[]) ?? [])
    .map((row: any) => row.superpowers)
    .filter(Boolean) as { id: string; label: string }[];

  const offerings = (offeringsRes.data as any[]) ?? [];

  const socialLinks: Record<string, string> = profile.social_links ?? {};
  const hasSocialLinks = Object.values(socialLinks).some((v) => (v as string)?.trim());
  const membershipLabel = profile.membership_type && profile.membership_type !== "none"
    ? (MEMBERSHIP_LABELS[profile.membership_type as string] ?? profile.membership_type)
    : null;

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
                <div className="flex flex-wrap gap-2">
                  {membershipLabel && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-clay/10 text-clay border border-clay/20">
                      {membershipLabel as string}
                    </span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs text-charcoal/50 border border-linen">
                      📍 {profile.location as string}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {bp.subheading && (
              <p className="text-charcoal/60 text-sm mt-5 pt-5 border-t border-linen leading-relaxed">
                {bp.subheading}
              </p>
            )}
          </div>

          {/* ── About ──────────────────────────────────────────────────────── */}
          {(profile.bio || bp.about) && (
            <div className="bg-white rounded-3xl border border-linen p-8 mb-6">
              <h2 className="font-serif text-xl text-soil mb-4">About</h2>
              <p className="text-charcoal/70 leading-relaxed whitespace-pre-wrap">
                {profile.bio ?? bp.about}
              </p>
            </div>
          )}

          {/* ── Superpowers ────────────────────────────────────────────────── */}
          {superpowers.length > 0 && (
            <div className="bg-white rounded-3xl border border-linen p-8 mb-6">
              <h2 className="font-serif text-xl text-soil mb-4">My Superpowers</h2>
              <div className="flex flex-wrap gap-2">
                {superpowers.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-moss/10 text-moss border border-moss/20"
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Offerings ──────────────────────────────────────────────────── */}
          {offerings.length > 0 && (
            <div className="bg-white rounded-3xl border border-linen p-8 mb-6">
              <h2 className="font-serif text-xl text-soil mb-5">What I Love to Give</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {offerings.map((o: any) => (
                  <div key={o.id} className="bg-linen/50 rounded-2xl p-5 border border-linen">
                    {o.icon && <div className="text-2xl mb-2">{o.icon}</div>}
                    <h3 className="font-medium text-soil mb-1">{o.title}</h3>
                    {o.description && (
                      <p className="text-sm text-charcoal/60 leading-relaxed">{o.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Social links ───────────────────────────────────────────────── */}
          {hasSocialLinks && (
            <div className="bg-white rounded-3xl border border-linen p-8 mb-6">
              <h2 className="font-serif text-xl text-soil mb-4">Find Me Online</h2>
              <div className="space-y-2">
                {Object.entries(socialLinks)
                  .filter(([, v]) => (v as string)?.trim())
                  .map(([key, value]) => {
                    const href = value.startsWith("http")
                      ? value
                      : key === "instagram"
                        ? `https://instagram.com/${value.replace("@", "")}`
                        : `https://${value}`;
                    return (
                      <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-clay hover:underline"
                      >
                        <span className="text-charcoal/40 text-xs w-20">
                          {SOCIAL_LABELS[key] ?? key}
                        </span>
                        <span>{value}</span>
                      </a>
                    );
                  })}
              </div>
            </div>
          )}

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
