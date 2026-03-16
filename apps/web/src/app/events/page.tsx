import { createServerClient } from "@hammock/database";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { EventsClient } from "@/components/EventsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events & Dinners — Hammock Earth",
  description:
    "Seasonal gatherings, farm tours, communal meals, and immersive workshops at Hammock Hills in Hillsdale, Ontario.",
};

export const runtime = "edge";
export const revalidate = 3600;

async function getEvents(tag?: string, type?: string) {
  const supabase = createServerClient();
  let query = supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("start_at", { ascending: true });

  if (tag) query = query.contains("tags", [tag]);
  if (type === "in-person") query = query.eq("is_online", false);
  else if (type === "online") query = query.eq("is_online", true);

  const { data } = await query;
  return data ?? [];
}

async function getAllTags() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("events")
    .select("tags")
    .eq("status", "published")
    .eq("visibility", "public");

  const tags = new Set<string>();
  data?.forEach((e) => e.tags?.forEach((t: string) => tags.add(t)));
  return Array.from(tags).sort();
}

async function getSeries(type?: string) {
  if (type === "in-person") return [];
  const supabase = createServerClient();
  const { data } = await supabase
    .from("event_series")
    .select("*, event_series_sessions(start_at, session_number)")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("created_at", { ascending: true });
  return data ?? [];
}

interface PageProps {
  searchParams: { tag?: string; type?: string };
}

export default async function EventsPage({ searchParams }: PageProps) {
  const [events, tags, seriesRaw] = await Promise.all([
    getEvents(searchParams.tag, searchParams.type),
    getAllTags(),
    getSeries(searchParams.type),
  ]);

  const seriesList = seriesRaw.map((s: any) => {
    const sessions = [...(s.event_series_sessions ?? [])]
      .sort((a: any, b: any) => a.session_number - b.session_number);
    return {
      ...s,
      firstSessionAt: sessions[0]?.start_at ?? s.created_at,
    };
  });

  return (
    <>
      <Nav />
      <main className="pt-16">
        {/* Header */}
        <div className="bg-linen border-b border-linen py-16 text-center">
          <p className="section-label mb-3">On the Land &amp; Online</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-soil mb-4">
            Events &amp; Dinners
          </h1>
          <p className="text-charcoal/70 max-w-xl mx-auto">
            Seasonal gatherings, farm tours, communal meals, and immersive
            workshops at Hammock Hills in Hillsdale, Ontario.
          </p>
        </div>

        <EventsClient
          events={events as any}
          seriesList={seriesList as any}
          allTags={tags}
          currentType={searchParams.type}
          currentTag={searchParams.tag}
        />
      </main>
      <Footer />
    </>
  );
}
