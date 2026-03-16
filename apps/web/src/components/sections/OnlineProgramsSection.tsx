import { createServerClient } from "@hammock/database";
import { EventCard } from "@hammock/ui";
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
      .limit(7);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function OnlineProgramsSection() {
  const events = await getOnlineEvents();

  return <OnlineProgramsClient events={events} />;
}
