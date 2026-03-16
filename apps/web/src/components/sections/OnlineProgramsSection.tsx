import { createServerClient } from "@hammock/database";
import { OnlineProgramsClient } from "./OnlineProgramsClient";

async function getOnlineEvents() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .eq("visibility", "public")
      .eq("is_online", true)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(6);
    return data ?? [];
  } catch {
    return [];
  }
}

async function getPublishedSeries() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("event_series")
      .select("*, event_series_sessions(start_at, session_number)")
      .eq("status", "published")
      .eq("visibility", "public")
      .eq("is_online", true)
      .order("created_at", { ascending: true })
      .limit(6);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function OnlineProgramsSection() {
  const [events, seriesList] = await Promise.all([
    getOnlineEvents(),
    getPublishedSeries(),
  ]);

  return <OnlineProgramsClient events={events} seriesList={seriesList} />;
}
