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
  tags = [],
}: EventCardProps) {
  const [dateTime, setDateTime] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date(startAt);
    const date = d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    setDateTime(`${date} · ${time}`);
  }, [startAt]);

  const href = registrationUrl ?? `/events/${slug}`;
  const isExternal = !!registrationUrl;

  return (
    <article className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-linen hover:shadow-md transition-shadow border-t-4 ${isOnline ? "border-t-[#7BA7BC]" : "border-t-moss"}`}>
      {coverImageUrl && (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={coverImageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {!coverImageUrl && (
        <div className="aspect-[16/9] bg-linen flex items-center justify-center">
          <span className="text-4xl">🌿</span>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {eventType && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-linen text-moss uppercase tracking-wide">
              {eventType}
            </span>
          )}
          {isOnline && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-moss/10 text-moss uppercase tracking-wide">
              Online
            </span>
          )}
        </div>

        <h3 className="font-serif text-xl text-soil mb-2 leading-snug">
          {title}
        </h3>

        <div className="space-y-1 mb-4 text-sm text-charcoal/70">
          <p>{dateTime ?? "\u00a0"}</p>
          <p>{location}</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-soil font-semibold text-lg">
              {formatPrice(priceCents)}
            </span>
            <span className="text-charcoal/50 text-sm ml-2">
              · Members {formatPrice(memberPriceCents)}
            </span>
          </div>

          {registrationNote ? (
            <span className="text-sm text-charcoal/50 italic">
              {registrationNote}
            </span>
          ) : (
            <a
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="inline-flex items-center gap-1 bg-clay text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-clay/90 transition-colors"
            >
              Register
              {isExternal && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              )}
            </a>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-linen">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[11px] text-charcoal/40 px-2 py-0.5 rounded-full bg-charcoal/5">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
