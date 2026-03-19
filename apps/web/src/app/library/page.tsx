import { createServerClient } from "@hammock/database";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { LibraryContent } from "@/components/LibraryContent";
import { MemberSidebar } from "@/components/MemberSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Living Room — Hammock Earth",
  description:
    "A curated sanctuary of knowledge, previous workshops and classes from regenerative soil practices to nervous system reset.",
};

export const revalidate = 300;

type AccessLevel = "guest" | "registered" | "member" | "collaborator" | "admin";

async function getUserAccessLevels(): Promise<AccessLevel[]> {
  const levels: AccessLevel[] = ["guest"];
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return levels;

    const db = createServerClient();
    const { data: profile } = await db
      .from("profiles")
      .select("role, membership_type, membership_status")
      .eq("id", user.id)
      .single();

    if (!profile) return levels;
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
  } catch {
    // Return guest levels on error
  }
  return levels;
}

function canAccess(visibleTo: string[], levels: AccessLevel[]): boolean {
  if ((visibleTo ?? []).includes("public")) return true;
  return (visibleTo ?? []).some((v) => levels.includes(v as AccessLevel));
}

export default async function LibraryPage() {
  const [levels, db] = await Promise.all([
    getUserAccessLevels(),
    Promise.resolve(createServerClient()),
  ]);

  const { data: rawItems } = await db
    .from("content_library" as any)
    .select(
      "id,slug,title,summary,cover_image_url,content_type,media_kind,external_url,topics,visible_to,is_featured,heart_count,read_time_minutes,watch_listen_minutes,published_at"
    )
    .not("published_at", "is", null)
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false });

  const items = (rawItems ?? []).map((item: any) => ({
    ...item,
    locked: !canAccess(item.visible_to ?? [], levels),
  }));

  const featured = items.find((i: any) => i.is_featured && !i.locked) ?? null;
  const userLevel = levels[levels.length - 1]; // highest level

  const isLoggedIn = levels.includes("registered");

  return (
    <div className="min-h-screen bg-cream">
      <Nav />
      <div className="pt-16 flex">
        {isLoggedIn && <MemberSidebar />}
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          {/* Hero */}
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="font-serif text-4xl sm:text-5xl text-soil mb-3">
              The Living Room
            </h1>
            <p className="text-lg text-soil/60 max-w-2xl">
              Resources for Growth — a curated sanctuary of knowledge, previous workshops and classes from regenerative soil practices to nervous system reset. Take a deep breath and explore at your own pace.
            </p>
          </section>

          <LibraryContent items={items} featured={featured} userLevel={userLevel} />
        </main>
      </div>
      <Footer />
    </div>
  );
}
