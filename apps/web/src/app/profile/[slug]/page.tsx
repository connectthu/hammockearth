import { notFound } from "next/navigation";
import type { Metadata } from "next";
import sanitizeHtml from "sanitize-html";
import { createServerClient } from "@hammock/database";
import { Footer } from "@/components/Footer";
import { ProfileNav } from "./ProfileNav";
import { ProfileSections } from "./ProfileSections";

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
    .select("id, user_id, slug, headline, subheading, about, is_published, buffer_minutes, cancellation_notice_hours")
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

  // Fetch session types, schedules, services, commitment packages in parallel
  const [sessionTypesRes, schedulesRes, servicesRes, packagesRes] = await Promise.all([
    db
      .from("session_types" as any)
      .select("id, name, description, duration_minutes, location_type, location_detail, price_cents, is_free")
      .eq("profile_id", bp.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    db
      .from("availability_schedules" as any)
      .select("day_of_week")
      .eq("profile_id", bp.id),
    db
      .from("services" as any)
      .select("id, icon, name, description")
      .eq("profile_id", bp.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    db
      .from("commitment_packages" as any)
      .select("*")
      .eq("profile_id", bp.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  const sessionTypes = (sessionTypesRes.data ?? []) as any[];
  const availabilityDays = [
    ...new Set(((schedulesRes.data ?? []) as any[]).map((s) => s.day_of_week as number)),
  ];
  const services = (servicesRes.data ?? []) as any[];
  const commitmentPackages = (packagesRes.data ?? []) as any[];

  return (
    <>
      <ProfileNav name={profile.full_name ?? bp.slug} />

      {/* ── Hero / About ──────────────────────────────────────────────────── */}
      <section id="about" className="bg-cream">
        <div className="max-w-6xl mx-auto px-8 pt-24 pb-20 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <p className="text-xs uppercase tracking-[0.2em] text-soil/40 mb-6">The Work</p>
            <h1 className="font-serif italic text-5xl lg:text-6xl text-soil leading-[1.1] mb-8">
              {bp.headline ?? profile.full_name ?? bp.slug}
            </h1>
            {bp.subheading && (
              <p className="text-soil/70 text-base leading-relaxed mb-4">{bp.subheading}</p>
            )}
            {bp.about && (
              <div
                className="prose prose-sm prose-stone max-w-none text-soil/55 prose-headings:text-soil prose-a:text-clay"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(bp.about, {
                    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h2", "h3"]),
                    allowedAttributes: { a: ["href", "rel", "target"] },
                  }),
                }}
              />
            )}
          </div>
          <div className="order-1 md:order-2 flex justify-center md:justify-end">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url as string}
                alt={profile.full_name ?? bp.slug}
                className="w-full max-w-[200px] md:max-w-sm rounded-3xl object-cover aspect-[3/4]"
              />
            ) : (
              <div className="w-full max-w-[200px] md:max-w-sm aspect-[3/4] rounded-3xl bg-linen flex items-center justify-center text-9xl">
                🌿
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Services, Commitment Slider, Booking ──────────────────────────── */}
      <ProfileSections
        services={services}
        commitmentPackages={commitmentPackages}
        slug={bp.slug}
        sessionTypes={sessionTypes}
        availabilityDays={availabilityDays}
        cancellationNoticeHours={bp.cancellation_notice_hours}
      />

      <Footer />
    </>
  );
}
