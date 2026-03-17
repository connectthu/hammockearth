import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MembershipSection } from "@/components/sections/MembershipSection";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Membership — Hammock Earth",
  description:
    "Join Hammock Earth as a Season Pass holder or Farm Friend. Access members-only events, farm days, workshops, and more.",
};

export const revalidate = 0;

export default async function MembersPage() {
  // If user is already a member, send to dashboard
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Check if they have an active membership
      const { createServerClient } = await import("@hammock/database");
      const db = createServerClient();
      const { data: membership } = await db
        .from("memberships")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("status", "active" as any)
        .limit(1)
        .single();

      if (membership) {
        redirect("/members/dashboard");
      }
    }
  } catch {
    // Not logged in or no membership — continue to show membership page
  }

  return (
    <>
      <Nav />
      <main className="pt-16">
        {/* Hero */}
        <div className="bg-linen border-b border-linen py-16 text-center px-4">
          <p className="section-label mb-3">Join the Community</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-soil mb-4">
            Hammock Earth Membership
          </h1>
          <p className="text-charcoal/70 max-w-2xl mx-auto">
            One membership unlocks the full season — events, farm days,
            workshops, community circles, and more.
          </p>
        </div>

        {/* Membership section (reused from homepage) */}
        <MembershipSection checkoutLinks />
      </main>
      <Footer />
    </>
  );
}
