"use client";

import { useState } from "react";
import { RegistrationModal } from "@hammock/ui";
import type { Event } from "@hammock/database";

interface WaitlistButtonProps {
  event: Event;
}

export function WaitlistButton({ event }: WaitlistButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block w-full text-center bg-soil/80 text-white font-medium py-3 px-6 rounded-full hover:bg-soil transition-colors"
      >
        Join Waitlist
      </button>
      {open && (
        <RegistrationModal event={event} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
