import { notFound } from "next/navigation";
import { ProfileBookingClient } from "./ProfileBookingClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

interface SessionType {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  location_type: "zoom" | "in_person" | "phone";
  location_detail: string | null;
  price_cents: number;
  is_free: boolean;
}

interface BookableProfile {
  id: string;
  slug: string;
  headline: string;
  subheading: string;
  about: string;
  avatar_url: string | null;
  buffer_minutes: number;
  cancellation_notice_hours: number;
}

export default async function ProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  const res = await fetch(`${API_URL}/profile/${params.slug}`, {
    cache: "no-store",
  });

  if (!res.ok) notFound();

  const data = (await res.json()) as {
    profile: BookableProfile;
    sessionTypes: SessionType[];
    availabilityDays: number[];
  };

  return (
    <ProfileBookingClient
      profile={data.profile}
      sessionTypes={data.sessionTypes}
      availabilityDays={data.availabilityDays}
    />
  );
}
