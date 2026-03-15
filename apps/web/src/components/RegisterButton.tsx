"use client";

import { useState } from "react";
import { RegistrationModal } from "@hammock/ui";
import type { Event } from "@hammock/database";

interface RegisterButtonProps {
  event: Event;
}

export function RegisterButton({ event }: RegisterButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block w-full text-center bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors"
      >
        Register Now
      </button>
      {open && (
        <RegistrationModal event={event} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
