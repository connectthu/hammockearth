import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Membership — Hammock Earth",
  description:
    "Join Hammock Earth as a Season Pass holder, Farm Friend, or Try a Month member.",
};

export default function MembersPage() {
  return (
    <>
      <Nav />
      <main className="pt-16">
        <div className="bg-linen border-b border-linen py-16 text-center">
          <p className="section-label mb-3">Join the Community</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-soil mb-4">
            Membership
          </h1>
          <p className="text-charcoal/70 max-w-xl mx-auto">
            Membership checkout is coming soon. For now, reach us at{" "}
            <a href="mailto:hello@hammock.earth" className="text-clay hover:underline">
              hello@hammock.earth
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
