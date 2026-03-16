"use client";

import React, { useEffect, useState } from "react";

interface SeriesCardProps {
  title: string;
  slug: string;
  startAt: string;
  durationWeeks: number;
  sessionCount: number;
  priceCents: number;
  memberPriceCents: number;
  dropInEnabled: boolean;
  dropInPriceCents?: number | null;
  coverImageUrl?: string | null;
  isOnline?: boolean;
  tags?: string[];
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function SeriesCard({
  title,
  slug,
  startAt,
  durationWeeks,
  sessionCount,
  priceCents,
  memberPriceCents,
  dropInEnabled,
  dropInPriceCents,
  coverImageUrl,
  tags = [],
}: SeriesCardProps) {
  const [startDate, setStartDate] = useState<string | null>(null);

  useEffect(() => {
    setStartDate(new Date(startAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }));
  }, [startAt]);

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-linen hover:shadow-md transition-shadow border-t-4 border-t-[#7BA7BC]">
      {coverImageUrl ? (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={coverImageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-linen flex items-center justify-center">
          <span className="text-4xl">🌿</span>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#7BA7BC]/10 text-[#5a8da3] uppercase tracking-wide">
            Online Program
          </span>
        </div>

        <h3 className="font-serif text-xl text-soil mb-1 leading-snug">
          {title}
        </h3>

        <p className="text-xs text-charcoal/50 mb-3">
          {durationWeeks} weeks · {sessionCount} sessions{startDate ? ` · starts ${startDate}` : ""}
        </p>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-soil font-semibold text-lg">
              {formatPrice(priceCents)}
            </span>
            <span className="text-charcoal/50 text-sm ml-2">
              · Members {formatPrice(memberPriceCents)}
            </span>
            {dropInEnabled && dropInPriceCents != null && (
              <p className="text-xs text-charcoal/40 mt-0.5">
                or {formatPrice(dropInPriceCents)}/session drop-in
              </p>
            )}
          </div>

          <a
            href={`/series/${slug}`}
            className="inline-flex items-center gap-1 bg-[#7BA7BC] text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-[#6a96ab] transition-colors"
          >
            Learn more
          </a>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-linen">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-charcoal/40 px-2 py-0.5 rounded-full bg-charcoal/5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
