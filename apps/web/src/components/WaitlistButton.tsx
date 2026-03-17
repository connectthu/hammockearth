"use client";

import { useState } from "react";
import { RegistrationModal } from "@hammock/ui";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@hammock/database";

interface WaitlistButtonProps {
  event: Event;
}

export function WaitlistButton({ event }: WaitlistButtonProps) {
  const [open, setOpen] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [authToken, setAuthToken] = useState<string | undefined>();

  const handleClick = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    let memberStatus = false;
    let token: string | undefined;

    if (session?.user) {
      token = session.access_token;
      const { data: membership } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .in("membership_type", ["season_pass", "try_a_month"])
        .limit(1)
        .maybeSingle();
      memberStatus = !!membership;
    }

    setAuthToken(token);
    setIsMember(memberStatus);
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="block w-full text-center bg-soil/80 text-white font-medium py-3 px-6 rounded-full hover:bg-soil transition-colors"
      >
        Join Waitlist
      </button>
      {open && (
        <RegistrationModal
          event={event}
          onClose={() => setOpen(false)}
          isMember={isMember}
          authToken={authToken}
        />
      )}
    </>
  );
}
