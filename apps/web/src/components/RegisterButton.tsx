"use client";

import { useState } from "react";
import { RegistrationModal } from "@hammock/ui";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@hammock/database";

interface RegisterButtonProps {
  event: Event;
  spotsRemaining?: number | null;
  isMember?: boolean;
}

export function RegisterButton({ event, spotsRemaining, isMember = false }: RegisterButtonProps) {
  const [open, setOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | undefined>();

  const handleClick = async () => {
    if (isMember) {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setAuthToken(session?.access_token);
    }
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="block w-full text-center bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors"
      >
        Register Now
      </button>
      {open && (
        <RegistrationModal
          event={event}
          spotsRemaining={spotsRemaining}
          onClose={() => setOpen(false)}
          isMember={isMember}
          authToken={authToken}
        />
      )}
    </>
  );
}
