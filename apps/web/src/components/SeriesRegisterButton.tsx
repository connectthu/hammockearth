"use client";

import { useState } from "react";
import { RegistrationModal } from "@hammock/ui";
import { createClient } from "@/lib/supabase/client";

interface SeriesRegisterButtonProps {
  series: {
    id: string;
    slug: string;
    title: string;
    price_cents: number;
    member_price_cents: number | null;
  };
  isMember?: boolean;
}

export function SeriesRegisterButton({ series, isMember = false }: SeriesRegisterButtonProps) {
  const [open, setOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | undefined>();

  const handleClick = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setAuthToken(session.access_token);
    }
    setOpen(true);
  };

  // RegistrationModal expects an EventSummary shape — we adapt series to fit
  const eventSummary = {
    id: series.id,
    slug: series.slug,
    title: series.title,
    start_at: new Date().toISOString(), // placeholder, not shown for series
    end_at: null,
    location: "Online",
    description: null,
    price_cents: series.price_cents,
    member_price_cents: series.member_price_cents,
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors text-sm"
      >
        Register for full series
      </button>

      {open && (
        <RegistrationModal
          event={eventSummary}
          onClose={() => setOpen(false)}
          seriesSlug={series.slug}
          registrationType="full_series"
          isMember={isMember}
          authToken={authToken}
        />
      )}
    </>
  );
}
