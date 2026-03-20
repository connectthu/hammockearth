import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@hammock/database";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { MemberSidebar } from "@/components/MemberSidebar";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings — Hammock Earth",
};

export const revalidate = 0;

export default async function SettingsPage() {
  const authSupabase = createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) redirect("/members/login?next=/members/settings");

  const db = createServerClient();
  const { data: profileData } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if ((profileData as any)?.role !== "superadmin") redirect("/members/dashboard");

  // Get the Supabase access token to pass to the client
  const { data: { session } } = await authSupabase.auth.getSession();
  const accessToken = session?.access_token ?? "";

  return (
    <>
      <Nav />
      <div className="pt-16 min-h-screen bg-cream flex">
        <MemberSidebar />
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="font-serif text-2xl text-soil mb-8">Settings</h1>
            <SettingsClient accessToken={accessToken} />
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}
