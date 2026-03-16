"use client";

import React, { useEffect, useState } from "react";

interface EventCardProps {
  title: string;
  slug: string;
  eventType?: string | null;
  startAt: string;
  location: string;
  priceCents: number;
  memberPriceCents: number;
  coverImageUrl?: string | null;
  isOnline?: boolean;
  registrationUrl?: string | null;
  registrationNote?: string | null;
  tags?: string[];
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}

export function EventCard({
  title,
  slug,
  eventType,
  startAt,
  location,
  priceCents,
  memberPriceCents,
  coverImageUrl,
  isOnline,
  registrationUrl,
  registrationNote,
}: EventCardProps) {
  const [dateTime, setDateTime] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date(startAt);
    const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    setDateTime(`${date} · ${time}`);
  }, [startAt]);

  const href = registrationUrl ?? `/events/${slug}`;
  const isExternal = !!registrationUrl;
  const topBorder = isOnline ? "border-t-[#7BA7BC]" : "border-t-moss";

  return (
    <article className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-linen hover:shadow-md transition-shadow border-t-[3px] ${topBorder} flex flex-col`}>
      {/* Cover image with overlaid badge */}
      <a href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined} className="relative block aspect-[4/3] overflow-hidden bg-linen flex-shrink-0">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-linen" />
        )}
        {/* Event type badge overlaid bottom-left of image */}
        {(eventType || isOnline) && (
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {eventType && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-linen/90 text-soil uppercase tracking-wide backdrop-blur-sm">
                {eventType}
              </span>
            )}
            {isOnline && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#7BA7BC]/90 text-white uppercase tracking-wide backdrop-blur-sm">
                Online
              </span>
            )}
          </div>
        )}
      </a>

      {/* Card body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-serif text-lg text-soil font-bold leading-snug mb-2">
          <a href={href} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined} className="hover:text-clay transition-colors">
            {title}
          </a>
        </h3>

        <div className="text-sm text-charcoal/60 space-y-0.5 mb-4">
          <p>{dateTime ?? "\u00a0"}</p>
          <p>{location}</p>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div>
            <span className="text-soil font-bold text-base">{formatPrice(priceCents)}</span>
            {memberPriceCents < priceCents && (
              <span className="text-charcoal/45 text-xs ml-1.5">· Members {formatPrice(memberPriceCents)}</span>
            )}
          </div>

          {registrationNote ? (
            <span className="text-xs text-charcoal/45 italic">{registrationNote}</span>
          ) : (
            <a
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="text-sm font-medium px-4 py-2 rounded-full bg-clay text-white hover:bg-clay/90 transition-colors flex-shrink-0"
            >
              Register
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
