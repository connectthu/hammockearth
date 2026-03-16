export const runtime = "edge";
export const revalidate = 0;

import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { VisionSection } from "@/components/sections/VisionSection";
import { MissionSection } from "@/components/sections/MissionSection";
import { ValuesSection } from "@/components/sections/ValuesSection";
import { EventsSection } from "@/components/sections/EventsSection";
import { MembershipSection } from "@/components/sections/MembershipSection";
import { OnlineProgramsSection } from "@/components/sections/OnlineProgramsSection";
import { TeamSection } from "@/components/sections/TeamSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { VisitSection } from "@/components/sections/VisitSection";
import { NewsletterSection } from "@/components/sections/NewsletterSection";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <AboutSection />
        <VisionSection />
        <MissionSection />
        <ValuesSection />
        <EventsSection />
        <MembershipSection />
        <OnlineProgramsSection />
        <TeamSection />
        <GallerySection />
        <VisitSection />
        <NewsletterSection />
      </main>
      <Footer />
    </>
  );
}
