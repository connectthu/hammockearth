import { createServerClient } from "@hammock/database";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ContentSocialLayer } from "@/components/ContentSocialLayer";
import { ExternalContent } from "@/components/ExternalContent";
import { MemberSidebar } from "@/components/MemberSidebar";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const db = createServerClient();
  const { data } = await db
    .from("content_library" as any)
    .select("title, summary")
    .eq("slug", params.slug)
    .single();
  if (!data) return { title: "The Living Room — Hammock Earth" };
  return {
    title: `${(data as any).title} — Hammock Earth`,
    description: (data as any).summary ?? undefined,
  };
}

export const revalidate = 0;

type AccessLevel = "guest" | "registered" | "member" | "collaborator" | "admin";

async function getAuthContext(): Promise<{ userId: string | null; levels: AccessLevel[] }> {
  const levels: AccessLevel[] = ["guest"];
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userId: null, levels };

    const db = createServerClient();
    const { data: profile } = await db
      .from("profiles")
      .select("role, membership_type, membership_status")
      .eq("id", user.id)
      .single();

    if (profile) {
      const p = profile as any;
      if (p.role !== 'genpop') {
        levels.push("registered");
      }
      if (
        ["farm_friend", "season_pass", "try_a_month"].includes(p.membership_type) &&
        p.membership_status === "active"
      ) {
        levels.push("member");
      }
      if (p.role === "collaborator" || p.role === "superadmin") levels.push("collaborator");
      if (p.role === "superadmin") levels.push("admin");
    }
    return { userId: user.id, levels };
  } catch {
    return { userId: null, levels };
  }
}

function canAccess(visibleTo: string[], levels: AccessLevel[]): boolean {
  return (visibleTo ?? []).some((v) => levels.includes(v as AccessLevel));
}

const TYPE_LABELS: Record<string, string> = {
  blog_post: "Blog Post",
  meditation: "Meditation",
  video: "Video",
  recipe: "Recipe",
  reflection: "Reflection",
  guide: "Guide",
  audio: "Audio",
  link: "Link",
};

const TOPIC_LABELS: Record<string, string> = {
  nervous_system: "Nervous System",
  homesteading: "Homesteading",
  nature_immersion: "Nature Immersion",
  community_building: "Community Building",
  wellness: "Wellness",
  cooking: "Cooking",
  permaculture: "Permaculture",
  creative_expression: "Creative Expression",
};

function LockedContent({ visibleTo }: { visibleTo: string[] }) {
  const needsMembership = visibleTo.includes("member");
  return (
    <div className="my-12 bg-white rounded-2xl border border-linen p-10 text-center max-w-lg mx-auto">
      <div className="text-4xl mb-4">🌿</div>
      <h2 className="font-serif text-xl text-soil mb-3">
        {needsMembership ? "Members-only content" : "Sign in to continue reading"}
      </h2>
      <p className="text-soil/60 mb-6">
        {needsMembership
          ? "This resource is available to Hammock Earth members. Join as a Season Pass holder or Farm Friend to access the full library."
          : "Create a free account or sign in to access this content."}
      </p>
      {needsMembership ? (
        <a
          href="/members"
          className="inline-block bg-clay text-white font-medium px-6 py-3 rounded-full hover:bg-clay/90 transition-colors"
        >
          Explore Membership
        </a>
      ) : (
        <a
          href="/members/login"
          className="inline-block bg-clay text-white font-medium px-6 py-3 rounded-full hover:bg-clay/90 transition-colors"
        >
          Sign in
        </a>
      )}
    </div>
  );
}

export default async function ContentItemPage({ params }: PageProps) {
  const db = createServerClient();
  const { data: raw } = await db
    .from("content_library" as any)
    .select("*")
    .eq("slug", params.slug)
    .not("published_at", "is", null)
    .single();

  if (!raw) notFound();
  const item = raw as any;

  const { userId, levels } = await getAuthContext();
  const locked = !canAccess(item.visible_to ?? [], levels);
  const isMember = levels.includes("member") || levels.includes("admin");

  // Check if user has hearted this item
  let hearted = false;
  if (userId && isMember) {
    const { data: heartRow } = await db
      .from("content_hearts" as any)
      .select("id")
      .eq("content_id", item.id)
      .eq("user_id", userId)
      .single();
    hearted = !!heartRow;
  }

  const isLoggedIn = !!userId;

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <div className="pt-16 flex">
        {isLoggedIn && <MemberSidebar />}
      <main className="flex-1 min-w-0">
        {/* Cover image */}
        {item.cover_image_url && (
          <div className="w-full h-72 sm:h-96 overflow-hidden bg-linen">
            <img
              src={item.cover_image_url}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-soil/40 mb-8">
            <a href="/library" className="hover:text-clay transition-colors">
              The Living Room
            </a>
            <span>/</span>
            <span>{TYPE_LABELS[item.content_type] ?? item.content_type}</span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs font-medium text-clay bg-clay/10 px-2.5 py-1 rounded-full">
              {TYPE_LABELS[item.content_type] ?? item.content_type}
            </span>
            {(item.topics ?? []).map((t: string) => (
              <span key={t} className="text-xs text-moss bg-moss/10 px-2.5 py-1 rounded-full">
                {TOPIC_LABELS[t] ?? t}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="font-serif text-4xl sm:text-5xl text-soil leading-tight mb-4">
            {item.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-soil/40 mb-8">
            {item.read_time_minutes && <span>{item.read_time_minutes} min read</span>}
            {item.watch_listen_minutes && <span>{item.watch_listen_minutes} min</span>}
            {item.published_at && (
              <span>
                {new Date(item.published_at).toLocaleDateString("en-CA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Summary */}
          {item.summary && (
            <p className="text-lg text-soil/70 leading-relaxed mb-10 pb-10 border-b border-linen">
              {item.summary}
            </p>
          )}

          {/* Locked gate */}
          {locked ? (
            <LockedContent visibleTo={item.visible_to ?? []} />
          ) : (
            <>
              {/* Media */}
              {item.media_url && item.media_kind === "video" && (
                <div className="rounded-xl overflow-hidden mb-10 aspect-video bg-soil">
                  <video src={item.media_url} controls className="w-full h-full" />
                </div>
              )}
              {item.media_url && item.media_kind === "audio" && (
                <div className="mb-10">
                  <audio src={item.media_url} controls className="w-full" />
                </div>
              )}
              {item.media_url && item.media_kind === "pdf" && (
                <div className="mb-10">
                  <a
                    href={item.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-clay hover:underline"
                  >
                    <span>📄</span> Open PDF
                  </a>
                </div>
              )}

              {/* External link / embed */}
              {item.external_url && (
                <ExternalContent url={item.external_url} summary={item.summary} />
              )}

              {/* Body */}
              {item.body && (
                <div
                  className="prose prose-stone prose-lg max-w-none prose-headings:font-serif prose-headings:text-soil prose-a:text-clay prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: item.body }}
                />
              )}
            </>
          )}

          {/* Social layer */}
          <ContentSocialLayer
            contentId={item.id}
            slug={item.slug}
            heartCount={item.heart_count}
            hearted={hearted}
            isMember={isMember}
            isLoggedIn={!!userId}
            locked={locked}
          />
        </div>
      </main>
      </div>
      <Footer />
    </div>
  );
}
