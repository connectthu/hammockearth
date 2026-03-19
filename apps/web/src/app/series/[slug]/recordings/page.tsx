import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@hammock/database";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import RecordingsViewer from "./RecordingsViewer";
import type { Metadata } from "next";

interface PageProps {
  params: { slug: string };
}

export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const db = createServerClient();
  const { data } = await db
    .from("event_series")
    .select("title")
    .eq("slug", params.slug)
    .single();
  return {
    title: `${(data as any)?.title ?? "Program"} — Recordings — Hammock Earth`,
  };
}

export default async function RecordingsPage({ params }: PageProps) {
  const { slug } = params;

  // Auth check
  const authSupabase = createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect(`/members/login?next=/series/${slug}/recordings`);
  }

  const db = createServerClient();

  // Fetch series
  const { data: seriesRaw } = await db
    .from("event_series")
    .select("id, title, slug, cover_image_url, description")
    .eq("slug", slug)
    .single();

  if (!seriesRaw) {
    redirect(`/series/${slug}`);
  }
  const series = seriesRaw as any;

  // Check access: confirmed full_series registration OR access grant
  const [{ data: regData }, { data: grantData }] = await Promise.all([
    db
      .from("event_registrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("series_id", series.id)
      .eq("registration_type", "full_series" as any)
      .eq("status", "confirmed")
      .limit(1),
    db
      .from("series_video_access_grants" as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("series_id", series.id)
      .limit(1),
  ]);

  const hasAccess =
    (regData && (regData as any[]).length > 0) ||
    (grantData && (grantData as any[]).length > 0);

  if (!hasAccess) {
    redirect(`/series/${slug}`);
  }

  // Fetch sessions + published videos
  const { data: sessionsRaw } = await db
    .from("event_series_sessions")
    .select(
      `id, session_number, title, start_at, end_at, status,
      session_videos (id, title, video_type, bunny_url, duration_minutes, display_order, is_published)`
    )
    .eq("series_id", series.id)
    .order("session_number", { ascending: true });

  const sessions = ((sessionsRaw as any[]) ?? []).map((s: any) => ({
    ...s,
    session_videos: (s.session_videos ?? [])
      .filter((v: any) => v.is_published)
      .sort((a: any, b: any) => a.display_order - b.display_order),
  }));

  return (
    <>
      <Nav />
      <div className="pt-16 min-h-screen bg-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/series/${slug}`}
              className="text-sm text-charcoal/50 hover:text-charcoal mb-4 inline-block"
            >
              ← Back to program
            </Link>
            <div className="flex gap-5 items-start">
              {series.cover_image_url ? (
                <img
                  src={series.cover_image_url}
                  alt={series.title}
                  className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-linen flex items-center justify-center flex-shrink-0 text-3xl">
                  🌿
                </div>
              )}
              <div>
                <h1 className="font-serif text-3xl text-soil">{series.title}</h1>
                <p className="text-charcoal/50 mt-1">Recordings</p>
              </div>
            </div>
          </div>

          <RecordingsViewer series={series} sessions={sessions} />
        </div>
      </div>
      <Footer />
    </>
  );
}
