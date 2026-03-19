import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@hammock/database";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { EditProfileForm } from "@/components/profile/EditProfileForm";
import { MemberSidebar } from "@/components/MemberSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Profile — Hammock Earth",
};

export const revalidate = 0;

export default async function EditProfilePage() {
  const authSupabase = createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/members/login?next=/members/profile/edit");
  }

  const db = createServerClient();

  // Fetch profile
  const { data: profileData } = await db
    .from("profiles")
    .select("id, full_name, avatar_url, bio, username, location, social_links, profile_visibility")
    .eq("id", user.id)
    .single();

  if (!profileData) {
    redirect("/members/dashboard");
  }

  const profile = profileData as any;

  // Fetch all superpowers + user's selected superpowers + offerings in parallel
  const [superpowersRes, profileSuperpowersRes, offeringsRes] = await Promise.all([
    db.from("superpowers").select("id, label").order("label"),
    db.from("profile_superpowers").select("superpower_id, superpowers(id, label)").eq("profile_id", user.id),
    db.from("offerings").select("id, title, description, icon, display_order").eq("profile_id", user.id).order("display_order"),
  ]);

  const allSuperpowers = (superpowersRes.data as any[]) ?? [];

  const selectedSuperpowers = ((profileSuperpowersRes.data as any[]) ?? [])
    .map((row: any) => row.superpowers)
    .filter(Boolean) as { id: string; label: string }[];

  const offerings = (offeringsRes.data as any[]) ?? [];

  return (
    <>
      <Nav />
      <div className="pt-16 min-h-screen bg-cream flex">
        <MemberSidebar />
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/members/dashboard"
              className="text-sm text-charcoal/50 hover:text-soil transition-colors"
            >
              ← Dashboard
            </Link>
            {profile.username && (
              <Link
                href={`/members/${profile.username}`}
                className="text-sm text-clay hover:underline"
              >
                View profile →
              </Link>
            )}
          </div>

          <h1 className="font-serif text-3xl text-soil mb-8">Edit Profile</h1>

          <div className="bg-white rounded-3xl border border-linen p-8">
            <EditProfileForm
              profile={{
                id: profile.id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                bio: profile.bio,
                username: profile.username,
                location: profile.location,
                social_links: profile.social_links ?? {},
                profile_visibility: profile.profile_visibility ?? "members_only",
              }}
              allSuperpowers={allSuperpowers}
              selectedSuperpowers={selectedSuperpowers}
              offerings={offerings}
            />
          </div>
        </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
