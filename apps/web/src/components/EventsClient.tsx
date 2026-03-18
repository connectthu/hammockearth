"use client";

import { useState, useEffect } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type EventItem = {
  id: string;
  title: string;
  slug: string;
  start_at: string;
  location: string | null;
  is_online: boolean;
  price_cents: number;
  member_price_cents: number;
  cover_image_url: string | null;
  tags: string[];
  registration_url: string | null;
  registration_note: string | null;
  event_type: string | null;
};

type SeriesItem = {
  id: string;
  title: string;
  slug: string;
  duration_weeks: number;
  session_count: number;
  price_cents: number;
  member_price_cents: number;
  drop_in_enabled: boolean;
  drop_in_price_cents: number | null;
  cover_image_url: string | null;
  is_online: boolean;
  tags: string[];
  firstSessionAt: string;
};

type ListItem = {
  id: string;
  kind: "event" | "series";
  title: string;
  slug: string;
  startAt: string;
  location: string | null;
  isOnline: boolean;
  priceCents: number;
  memberPriceCents: number;
  coverImageUrl: string | null;
  tags: string[];
  registrationUrl?: string | null;
  registrationNote?: string | null;
  eventType?: string | null;
  durationWeeks?: number;
  sessionCount?: number;
};

export interface EventsClientProps {
  events: EventItem[];
  seriesList: SeriesItem[];
  allTags: string[];
  currentType?: string;
  currentTag?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Use UTC slice for consistent SSR/client rendering
function toDateKey(iso: string): string {
  return iso.slice(0, 10); // "2026-04-18"
}

function formatSectionHeader(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const datePart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  return `${datePart} · ${weekday}`;
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}`;
}

function groupByDate(items: ListItem[]): [string, ListItem[]][] {
  const map = new Map<string, ListItem[]>();
  for (const item of items) {
    const key = toDateKey(item.startAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries());
}

// ── MiniCalendar ─────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type DotMap = Record<string, { online: boolean; inPerson: boolean }>;

function MiniCalendar({
  year, month, dots, todayKey, onPrev, onNext, onDayClick,
}: {
  year: number;
  month: number;
  dots: DotMap;
  todayKey: string | null;
  onPrev: () => void;
  onNext: () => void;
  onDayClick: (key: string) => void;
}) {
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: { key: string | null; day: number | null }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ key: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ key, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ key: null, day: null });

  return (
    <div className="bg-white rounded-2xl border border-linen p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-linen transition-colors text-charcoal/40 hover:text-soil text-xl leading-none"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="font-serif text-lg font-semibold text-soil">
          {MONTH_NAMES[month]}
        </span>
        <button
          onClick={onNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-linen transition-colors text-charcoal/40 hover:text-soil text-xl leading-none"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-charcoal/40 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, i) => {
          if (!cell.key || !cell.day) return <div key={i} />;
          const isToday = cell.key === todayKey;
          const dot = dots[cell.key];
          return (
            <button
              key={cell.key}
              onClick={() => dot && onDayClick(cell.key!)}
              className={`flex flex-col items-center justify-center rounded-lg py-2 text-sm transition-colors ${
                isToday
                  ? "bg-clay text-white font-bold"
                  : dot
                  ? "hover:bg-linen cursor-pointer text-soil font-semibold"
                  : "text-charcoal/35 cursor-default"
              }`}
            >
              <span>{cell.day}</span>
              {dot && !isToday && (
                <div className="flex gap-0.5 mt-0.5">
                  {dot.inPerson && <span className="w-1.5 h-1.5 rounded-full bg-moss" />}
                  {dot.online && <span className="w-1.5 h-1.5 rounded-full bg-[#7BA7BC]" />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── EventRow ─────────────────────────────────────────────────────────────────

function EventRow({ item }: { item: ListItem }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    setTime(
      new Date(item.startAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  }, [item.startAt]);

  const href =
    item.kind === "series"
      ? `/series/${item.slug}`
      : item.registrationUrl ?? `/events/${item.slug}`;
  const isExternal = item.kind === "event" && !!item.registrationUrl;
  const dotColor = item.isOnline ? "bg-[#7BA7BC]" : "bg-moss";

  return (
    <div className="relative pl-8 pb-4 last:pb-0">
      {/* Timeline dot */}
      <div
        className={`absolute left-0 top-[26px] w-3.5 h-3.5 rounded-full border-[3px] border-cream shadow-sm ${dotColor}`}
      />

      <div className="flex gap-4 items-start bg-white rounded-2xl border border-linen shadow-sm p-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-charcoal/40 mb-0.5 font-medium tabular-nums">
            {time ?? "\u00a0"}
          </p>
          <h3 className="font-serif text-lg sm:text-xl text-soil leading-snug mb-1">
            <a
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="hover:text-clay transition-colors"
            >
              {item.title}
            </a>
          </h3>

          {item.kind === "series" && (
            <p className="text-xs text-[#7BA7BC] font-semibold mb-1.5 uppercase tracking-wide">
              {item.durationWeeks}-week program · {item.sessionCount} sessions
            </p>
          )}

          {item.location && (
            <p className="text-sm text-charcoal/55 mb-2.5 flex items-center gap-1.5">
              {item.isOnline ? (
                <svg className="w-3.5 h-3.5 text-[#7BA7BC] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-moss flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              {item.location}
            </p>
          )}

          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-semibold text-white bg-clay px-2.5 py-0.5 rounded-full">
              {formatPrice(item.priceCents)}
            </span>
            {item.memberPriceCents !== null && item.memberPriceCents < item.priceCents && (
              <span className="text-xs font-medium text-moss bg-moss/10 px-2.5 py-0.5 rounded-full">
                Members: {formatPrice(item.memberPriceCents)}
              </span>
            )}
            {item.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-charcoal/50 px-2 py-0.5 rounded-full bg-charcoal/5 border border-linen"
              >
                {tag}
              </span>
            ))}
          </div>

          {item.registrationNote && (
            <p className="text-xs text-charcoal/40 mt-1.5 italic">{item.registrationNote}</p>
          )}
        </div>

        {/* Thumbnail */}
        <a href={href} className="flex-shrink-0 hidden sm:block">
          {item.coverImageUrl ? (
            <div className="w-[88px] h-[88px] rounded-xl overflow-hidden">
              <img
                src={item.coverImageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-[88px] h-[88px] rounded-xl bg-linen flex items-center justify-center">
              <span className="text-2xl">🌿</span>
            </div>
          )}
        </a>
      </div>
    </div>
  );
}

// ── DateGroup ─────────────────────────────────────────────────────────────────

function DateGroup({ dateKey, items, sticky }: { dateKey: string; items: ListItem[]; sticky: boolean }) {
  return (
    <div id={`date-${dateKey}`} className="mb-8 scroll-mt-24">
      {/* Section header */}
      <div
        className={`flex items-center gap-3 py-2 mb-4 ${sticky ? "sticky top-[65px] bg-cream z-10" : ""}`}
      >
        <span className="text-xs font-semibold text-charcoal/45 uppercase tracking-widest whitespace-nowrap">
          {formatSectionHeader(dateKey)}
        </span>
        <div className="flex-1 border-t border-linen" />
      </div>

      {/* Timeline */}
      <div className="relative border-l-2 border-linen ml-[7px]">
        {items.map((item) => (
          <EventRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ── EventsClient ──────────────────────────────────────────────────────────────

export function EventsClient({
  events,
  seriesList,
  allTags,
  currentType,
  currentTag,
}: EventsClientProps) {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  const [calYear, setCalYear] = useState(now.getUTCFullYear());
  const [calMonth, setCalMonth] = useState(now.getUTCMonth());
  const [todayKeyClient, setTodayKeyClient] = useState<string | null>(null);

  useEffect(() => {
    setTodayKeyClient(now.toISOString().slice(0, 10));
    setCalYear(now.getUTCFullYear());
    setCalMonth(now.getUTCMonth());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build combined list
  const allItems: ListItem[] = [
    ...events.map((e): ListItem => ({
      id: e.id,
      kind: "event",
      title: e.title,
      slug: e.slug,
      startAt: e.start_at,
      location: e.location,
      isOnline: e.is_online,
      priceCents: e.price_cents,
      memberPriceCents: e.member_price_cents,
      coverImageUrl: e.cover_image_url,
      tags: e.tags ?? [],
      registrationUrl: e.registration_url,
      registrationNote: e.registration_note,
      eventType: e.event_type,
    })),
    ...seriesList
      .filter(() => !currentType || currentType === "online")
      .map((s): ListItem => ({
        id: s.id,
        kind: "series",
        title: s.title,
        slug: s.slug,
        startAt: s.firstSessionAt,
        location: null,
        isOnline: s.is_online,
        priceCents: s.price_cents,
        memberPriceCents: s.member_price_cents,
        coverImageUrl: s.cover_image_url,
        tags: s.tags ?? [],
        durationWeeks: s.duration_weeks,
        sessionCount: s.session_count,
      })),
  ].sort((a, b) => a.startAt.localeCompare(b.startAt));

  const nowMs = now.getTime();
  const upcoming = allItems.filter((i) => new Date(i.startAt).getTime() >= nowMs);
  const past = [...allItems.filter((i) => new Date(i.startAt).getTime() < nowMs)].reverse();

  const upcomingGroups = groupByDate(upcoming);
  const pastGroups = groupByDate(past);

  // Dot map for calendar
  const dots: DotMap = {};
  for (const item of allItems) {
    const key = toDateKey(item.startAt);
    if (!dots[key]) dots[key] = { online: false, inPerson: false };
    if (item.isOnline) dots[key].online = true;
    else dots[key].inPerson = true;
  }

  function scrollToDate(key: string) {
    document.getElementById(`date-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function typeHref(value: string) {
    const params = new URLSearchParams();
    if (value) params.set("type", value);
    if (currentTag) params.set("tag", currentTag);
    const qs = params.toString();
    return `/events${qs ? "?" + qs : ""}`;
  }

  function tagHref(tag: string) {
    const params = new URLSearchParams();
    if (currentType) params.set("type", currentType);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    return `/events${qs ? "?" + qs : ""}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 mb-10 flex-wrap">
        <div className="flex gap-2">
          {[
            { label: "All", value: "" },
            { label: "On the Land", value: "in-person" },
            { label: "Online", value: "online" },
          ].map(({ label, value }) => {
            const isActive = value ? currentType === value : !currentType;
            return (
              <a
                key={label}
                href={typeHref(value)}
                className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                  isActive
                    ? "bg-soil text-cream border-soil"
                    : "border-linen text-charcoal/60 hover:border-soil hover:text-soil"
                }`}
              >
                {label}
              </a>
            );
          })}
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-charcoal/40 whitespace-nowrap">Filter by topic</label>
            <select
              defaultValue={currentTag ?? ""}
              onChange={(e) => { window.location.href = tagHref(e.target.value); }}
              className="text-sm border border-linen rounded-full px-3 py-1.5 bg-white text-charcoal/70 focus:outline-none focus:border-soil cursor-pointer"
            >
              <option value="">All topics</option>
              {allTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-10 items-start">
        {/* Event list */}
        <div className="flex-1 min-w-0">
          {upcoming.length === 0 && past.length === 0 && (
            <div className="text-center py-20">
              <p className="text-5xl mb-6">🌿</p>
              <p className="font-serif text-xl text-soil mb-3">More events coming soon.</p>
              <p className="text-charcoal/60 mb-6">Sign up to be the first to hear about new events.</p>
              <a
                href="/#newsletter"
                className="inline-flex items-center gap-2 bg-clay text-white font-medium px-8 py-3 rounded-full hover:bg-clay/90 transition-colors text-sm"
              >
                Get notified
              </a>
            </div>
          )}

          {upcomingGroups.map(([dateKey, items]) => (
            <DateGroup key={dateKey} dateKey={dateKey} items={items} sticky />
          ))}

          {pastGroups.length > 0 && (
            <div className="mt-14 opacity-55">
              <h2 className="font-serif text-xl text-soil mb-8">Past Events</h2>
              {pastGroups.map(([dateKey, items]) => (
                <DateGroup key={dateKey} dateKey={dateKey} items={items} sticky={false} />
              ))}
            </div>
          )}
        </div>

        {/* Sticky calendar — desktop only */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-24">
            <MiniCalendar
              year={calYear}
              month={calMonth}
              dots={dots}
              todayKey={todayKeyClient}
              onPrev={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
                else setCalMonth((m) => m - 1);
              }}
              onNext={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
                else setCalMonth((m) => m + 1);
              }}
              onDayClick={scrollToDate}
            />
            {/* Legend */}
            <div className="mt-4 flex flex-col gap-1.5 px-1">
              <div className="flex items-center gap-2 text-xs text-charcoal/50">
                <span className="w-2 h-2 rounded-full bg-moss" /> On the Land
              </div>
              <div className="flex items-center gap-2 text-xs text-charcoal/50">
                <span className="w-2 h-2 rounded-full bg-[#7BA7BC]" /> Online
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
