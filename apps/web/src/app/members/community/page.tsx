import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@hammock/database";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { MemberSidebar } from "@/components/MemberSidebar";
import { CommunityBoard } from "@/components/CommunityBoard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Board — Hammock Earth",
  description: "Share shoutouts and ask for help from fellow Hammock Earth members.",
};

export const revalidate = 0;

export default async function CommunityPage() {
  const authSupabase = createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/members/login?next=/members/community");
  }

  const db = createServerClient();
  const { data: profileData } = await db
    .from("profiles")
    .select("role, membership_type, membership_status")
    .eq("id", user.id)
    .single();

  const profile = profileData as any;
  const isMember =
    profile?.role !== "genpop" ||
    (["farm_friend", "season_pass", "try_a_month"].includes(profile?.membership_type) &&
      profile?.membership_status === "active");

  return (
    <>
      <Nav />
      <div className="pt-16 min-h-screen bg-cream flex">
        <MemberSidebar />
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          <CommunityBoard isMember={isMember} userId={user.id} />
        </main>
      </div>
      <Footer />
    </>
  );
}
