import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@hammock/database";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const revalidate = 60;

interface PageProps {
  params: { username: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `@${params.username} — Hammock Earth`,
  };
}

export default async function MemberProfilePage({ params }: PageProps) {
  const { username } = params;

  const db = createServerClient();

  // Fetch profile by username
  const { data: profileData } = await db
    .from("profiles")
    .select("id, full_name, avatar_url, bio, username, location, social_links, profile_visibility, membership_type, role")
    .eq("username", username)
    .maybeSingle();

  if (!profileData) notFound();

  const profile = profileData as any;

  // Determine viewer identity
  const authSupabase = createClient();
  const {
    data: { user: viewer },
  } = await authSupabase.auth.getUser();

  const isOwnProfile = viewer?.id === profile.id;

  // Fetch viewer's role if logged in
  let viewerRole: string | null = null;
  if (viewer) {
    const { data: viewerProfile } = await db
      .from("profiles")
      .select("role")
      .eq("id", viewer.id)
      .single();
    viewerRole = (viewerProfile as any)?.role ?? null;
  }

  const canView =
    isOwnProfile ||
    profile.profile_visibility === "public" ||
    (profile.profile_visibility === "members_only" &&
      viewerRole &&
      ["member", "collaborator", "superadmin"].includes(viewerRole));

  // Membership badge label
  const MEMBERSHIP_LABELS: Record<string, string> = {
    season_pass: "Seasons Pass",
    farm_friend: "Farm Friend",
    try_a_month: "Try a Month",
    community_partner: "Community Partner",
  };
  const membershipLabel = profile.membership_type && profile.membership_type !== "none"
    ? MEMBERSHIP_LABELS[profile.membership_type] ?? profile.membership_type
    : null;

  if (!canView) {
    return (
      <>
        <Nav />
        <main className="pt-16 min-h-screen bg-cream flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto px-4 py-16">
            <div className="text-5xl mb-6">🌿</div>
            <h1 className="font-serif text-2xl text-soil mb-3">
              {profile.full_name ?? `@${username}`}
            </h1>
            <p className="text-charcoal/60 mb-8 leading-relaxed">
              This profile is for Hammock Earth members only.
            </p>
            <Link
              href="/members"
              className="inline-block bg-clay text-white font-medium py-3 px-8 rounded-full hover:bg-clay/90 transition-colors mb-4"
            >
              Explore Membership
            </Link>
            <br />
            <Link
              href="/members/login"
              className="text-sm text-charcoal/50 hover:text-soil transition-colors"
            >
              Already a member? Sign in →
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Fetch superpowers + offerings in parallel
  const [superpowersRes, offeringsRes] = await Promise.all([
    db
      .from("profile_superpowers")
      .select("superpowers(id, label)")
      .eq("profile_id", profile.id),
    db
      .from("offerings")
      .select("id, title, description, icon")
      .eq("profile_id", profile.id)
      .order("display_order"),
  ]);

  const superpowers = ((superpowersRes.data as any[]) ?? [])
    .map((row: any) => row.superpowers)
    .filter(Boolean) as { id: string; label: string }[];

  const offerings = (offeringsRes.data as any[]) ?? [];

  const socialLinks: Record<string, string> = profile.social_links ?? {};
  const hasSocialLinks = Object.values(socialLinks).some((v) => v?.trim());

  const SOCIAL_LABELS: Record<string, string> = {
    instagram: "Instagram",
    website: "Website",
    substack: "Substack",
    other: "Link",
  };

  return (
    <>
      <Nav />
      <main className="pt-16 min-h-screen bg-cream">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* Own profile edit link */}
          {isOwnProfile && (
            <div className="flex justify-end mb-4">
              <Link
                href="/members/profile/edit"
                className="text-sm text-clay hover:underline"
              >
                Edit Profile →
              </Link>
            </div>
          )}

          {/* Profile header */}
          <div className="bg-white rounded-3xl border border-linen p-8 mb-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name ?? username}
                    className="w-36 h-36 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-2xl bg-linen flex items-center justify-center text-5xl">
                    🌿
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="font-serif text-3xl text-soil leading-tight mb-1">
                  {profile.full_name ?? `@${username}`}
                </h1>
                <p className="text-charcoal/50 text-sm mb-3">@{username}</p>

                <div className="flex flex-wrap gap-2">
                  {membershipLabel && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-clay/10 text-clay border border-clay/20">
                      {membershipLabel}
                    </span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs text-charcoal/50 border border-linen">
                      📍 {profile.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* About Me */}
          {profile.bio && (
            <div className="bg-white rounded-3xl border border-linen p-8 mb-6">
              <h2 className="font-serif text-xl text-soil mb-4">About Me</h2>
              <p className="text-charcoal/70 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {/* Superpowers */}
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

          {/* Offerings */}
          {offerings.length > 0 && (
            <div className="bg-white rounded-3xl border border-linen p-8 mb-6">
              <h2 className="font-serif text-xl text-soil mb-5">What I Love to Give</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {offerings.map((o: any) => (
                  <div
                    key={o.id}
                    className="bg-linen/50 rounded-2xl p-5 border border-linen"
                  >
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

          {/* Social Links */}
          {hasSocialLinks && (
            <div className="bg-white rounded-3xl border border-linen p-8 mb-6">
              <h2 className="font-serif text-xl text-soil mb-4">Find Me Online</h2>
              <div className="space-y-2">
                {Object.entries(socialLinks)
                  .filter(([, v]) => v?.trim())
                  .map(([key, value]) => {
                    const href = value.startsWith("http") ? value :
                      key === "instagram" ? `https://instagram.com/${value.replace("@", "")}` :
                      `https://${value}`;
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

          {/* Back to community */}
          <div className="text-center mt-6">
            <Link
              href="/members/dashboard"
              className="text-sm text-charcoal/50 hover:text-soil transition-colors"
            >
              ← Back to dashboard
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
