"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

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

interface BookingResult {
  id: string;
  startAt: string;
  endAt: string;
  sessionTypeName: string;
  durationMinutes: number;
  locationType: string;
  locationDetail: string | null;
  bookerName: string;
  bookerEmail: string;
  timezone: string;
  cancellationToken: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function locationLabel(type: string, detail: string | null) {
  if (type === "zoom") return { icon: "🎥", text: "Zoom" };
  if (type === "phone") return { icon: "📞", text: "Phone call" };
  return { icon: "📍", text: detail ?? "At the Farm" };
}

function formatSlot(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(iso: string, tz: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function generateGoogleCalendarUrl(booking: BookingResult): string {
  const start = new Date(booking.startAt)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const end = new Date(booking.endAt)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const location =
    booking.locationType === "zoom"
      ? "Zoom (link to follow)"
      : booking.locationDetail ?? "TBD";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: booking.sessionTypeName,
    dates: `${start}/${end}`,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadIcs(booking: BookingResult): void {
  const formatDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const location =
    booking.locationType === "zoom"
      ? "Zoom (link to follow)"
      : booking.locationDetail ?? "TBD";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hammock Earth//Booking//EN",
    "BEGIN:VEVENT",
    `UID:booking-${booking.id}@hammock.earth`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(new Date(booking.startAt))}`,
    `DTEND:${formatDate(new Date(booking.endAt))}`,
    `SUMMARY:${booking.sessionTypeName}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "session.ics";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({
  year,
  month,
  availabilityDays,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: {
  year: number;
  month: number; // 0-indexed
  availabilityDays: number[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  };
  const nextMonth = () => {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  };

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-linen text-soil/60 hover:text-soil transition-colors"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-soil">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-linen text-soil/60 hover:text-soil transition-colors"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-soil/40 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const date = new Date(year, month, day);
          const isPast = date < today;
          const dow = date.getDay();
          const hasSchedule = availabilityDays.includes(dow);
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = selectedDate === dateStr;
          const isToday =
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();

          const clickable = !isPast && hasSchedule;

          return (
            <button
              key={day}
              disabled={!clickable}
              onClick={() => clickable && onSelectDate(dateStr)}
              className={`
                aspect-square flex items-center justify-center rounded-full text-sm transition-colors
                ${isSelected ? "bg-moss text-white font-medium" : ""}
                ${!isSelected && isToday ? "ring-1 ring-moss text-moss font-medium" : ""}
                ${!isSelected && !isToday && clickable ? "hover:bg-linen text-soil cursor-pointer" : ""}
                ${isPast || !hasSchedule ? "text-soil/20 cursor-default" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ProfileBookingClient({
  profile,
  sessionTypes,
  availabilityDays,
}: {
  profile: BookableProfile;
  sessionTypes: SessionType[];
  availabilityDays: number[];
}) {
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [step, setStep] = useState<1 | 2 | 3 | "confirmed">(1);
  const [selectedType, setSelectedType] = useState<SessionType | null>(null);
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [booking, setBooking] = useState<BookingResult | null>(null);

  const fetchSlots = useCallback(
    async (date: string, typeId: string) => {
      setSlotsLoading(true);
      setSlots([]);
      setSelectedSlot(null);
      try {
        const res = await fetch(
          `${API_URL}/profile/${profile.slug}/availability?date=${date}&sessionTypeId=${typeId}`
        );
        if (res.ok) {
          const data = (await res.json()) as string[];
          setSlots(data);
        }
      } finally {
        setSlotsLoading(false);
      }
    },
    [profile.slug]
  );

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (selectedType) fetchSlots(date, selectedType.id);
  };

  const handleTypeSelect = (type: SessionType) => {
    setSelectedType(type);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
    setStep(2);
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep(3);
  };

  const handleBook = async () => {
    if (!selectedType || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`${API_URL}/profile/${profile.slug}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionTypeId: selectedType.id,
          bookerName: name,
          bookerEmail: email,
          bookerNotes: notes || undefined,
          startAt: selectedSlot,
          timezone: userTz,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { message?: string };
        setSubmitError(err.message ?? "Something went wrong. Please try again.");
        return;
      }
      const result = (await res.json()) as BookingResult;
      setBooking(result);
      setStep("confirmed");
    } catch {
      setSubmitError("Failed to create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Summary sidebar info
  const summarySession = selectedType
    ? `${selectedType.duration_minutes} min · ${selectedType.name}`
    : null;
  const summaryDateTime =
    selectedSlot && selectedType
      ? formatDate(selectedSlot, userTz)
      : null;

  return (
    <div className="min-h-screen bg-cream">
      {/* Thin top bar */}
      <div className="h-1 bg-moss" />

      <div className="max-w-5xl mx-auto px-4 py-10 lg:py-16">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
          {/* ── Left sticky column ─────────────────────────────────────────── */}
          <div className="lg:w-72 lg:sticky lg:top-10 lg:self-start space-y-6">
            {profile.avatar_url && (
              <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-linen">
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

            {profile.headline && (
              <h1
                className="font-serif text-2xl italic leading-snug text-soil"
                style={{ fontFamily: "Lora, Georgia, serif" }}
              >
                {profile.headline}
              </h1>
            )}

            {profile.subheading && (
              <p className="text-sm text-soil/70 leading-relaxed">{profile.subheading}</p>
            )}

            {/* Session summary card — shown once session + date/time chosen */}
            {(summarySession || summaryDateTime) && (
              <div className="rounded-xl bg-white border border-linen p-4 space-y-2">
                {selectedType && (
                  <div className="flex items-start gap-2">
                    <span className="text-moss mt-0.5">
                      {locationLabel(selectedType.location_type, selectedType.location_detail).icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-soil">{selectedType.name}</p>
                      <p className="text-xs text-soil/50">
                        {selectedType.duration_minutes} min ·{" "}
                        {locationLabel(selectedType.location_type, selectedType.location_detail).text}
                      </p>
                    </div>
                  </div>
                )}
                {summaryDateTime && (
                  <p className="text-xs text-soil/60 pt-1 border-t border-linen">{summaryDateTime}</p>
                )}
              </div>
            )}

            {profile.about && (
              <p className="text-xs text-soil/50 leading-relaxed">{profile.about}</p>
            )}
          </div>

          {/* ── Right column — booking flow ─────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* ── CONFIRMED ─────────────────────────────────── */}
            {step === "confirmed" && booking && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-moss/15 flex items-center justify-center">
                    <span className="text-moss text-lg">✓</span>
                  </div>
                  <div>
                    <h2 className="font-serif text-xl text-soil">You&apos;re booked!</h2>
                    <p className="text-sm text-soil/60">A confirmation has been sent to {booking.bookerEmail}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-linen p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-soil/50">Session</span>
                    <span className="text-soil font-medium">{booking.sessionTypeName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-soil/50">Date &amp; Time</span>
                    <span className="text-soil font-medium text-right max-w-[60%]">
                      {formatDate(booking.startAt, booking.timezone)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-soil/50">Duration</span>
                    <span className="text-soil">{booking.durationMinutes} min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-soil/50">Location</span>
                    <span className="text-soil">
                      {booking.locationType === "zoom"
                        ? "Zoom (link to follow)"
                        : booking.locationType === "phone"
                          ? "Phone call"
                          : booking.locationDetail ?? "TBD"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={generateGoogleCalendarUrl(booking)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-soil text-cream text-sm font-medium hover:bg-soil/90 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
                    </svg>
                    Add to Google Calendar
                  </a>
                  <button
                    onClick={() => downloadIcs(booking)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-linen text-soil text-sm font-medium hover:bg-linen/80 transition-colors border border-linen"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5 20h14v-2H5v2zm7-18l-7 7h4v6h6v-6h4l-7-7z" />
                    </svg>
                    Download .ics
                  </button>
                </div>

                <p className="text-xs text-soil/40 text-center">
                  Need to cancel?{" "}
                  <a
                    href={`/profile/${profile.slug}/cancel/${booking.cancellationToken}`}
                    className="text-clay hover:underline"
                  >
                    Cancel this booking
                  </a>
                </p>
              </div>
            )}

            {/* ── STEP 1 — Select session type ─────────────────────────────── */}
            {step !== "confirmed" && (
              <>
                <div className="mb-8">
                  <StepIndicator current={step as 1 | 2 | 3} />
                </div>

                {step === 1 && (
                  <div className="space-y-4">
                    <h2 className="font-serif text-lg text-soil mb-4">Select a session type</h2>
                    {sessionTypes.length === 0 && (
                      <p className="text-soil/50 text-sm">No sessions available at this time.</p>
                    )}
                    {sessionTypes.map((type) => {
                      const loc = locationLabel(type.location_type, type.location_detail);
                      return (
                        <button
                          key={type.id}
                          onClick={() => handleTypeSelect(type)}
                          className={`
                            w-full text-left rounded-2xl border p-4 transition-all
                            ${selectedType?.id === type.id
                              ? "border-moss bg-moss/5 ring-1 ring-moss"
                              : "border-linen bg-white hover:border-moss/40 hover:bg-linen/50"
                            }
                          `}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              <p className="font-medium text-soil">{type.name}</p>
                              {type.description && (
                                <p className="text-sm text-soil/60 leading-relaxed">{type.description}</p>
                              )}
                              <div className="flex items-center gap-3 pt-1">
                                <span className="text-xs text-soil/50">
                                  {type.duration_minutes} min
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-linen text-soil/60">
                                  {loc.icon} {loc.text}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              {type.is_free ? (
                                <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full bg-moss/10 text-moss">
                                  FREE
                                </span>
                              ) : type.price_cents > 0 ? (
                                <span className="text-sm font-medium text-clay">
                                  CA${(type.price_cents / 100).toFixed(0)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ── STEP 2 — Choose date & time ──────────────────────────── */}
                {step === 2 && selectedType && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <button
                        onClick={() => { setStep(1); setSelectedDate(null); setSelectedSlot(null); }}
                        className="text-sm text-soil/50 hover:text-soil flex items-center gap-1"
                      >
                        ← Back
                      </button>
                      <h2 className="font-serif text-lg text-soil">Choose date &amp; time</h2>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6">
                      {/* Calendar */}
                      <div className="bg-white rounded-2xl border border-linen p-4 sm:w-72 shrink-0">
                        <MiniCalendar
                          year={calYear}
                          month={calMonth}
                          availabilityDays={availabilityDays}
                          selectedDate={selectedDate}
                          onSelectDate={handleDateSelect}
                          onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
                        />
                        <p className="text-xs text-soil/40 mt-3 text-center">
                          Showing in {userTz.replace(/_/g, " ")}
                        </p>
                      </div>

                      {/* Time slots */}
                      <div className="flex-1 min-w-0">
                        {!selectedDate && (
                          <p className="text-sm text-soil/50 mt-4">Select a date to see available times</p>
                        )}
                        {selectedDate && slotsLoading && (
                          <p className="text-sm text-soil/50 mt-4">Loading available times…</p>
                        )}
                        {selectedDate && !slotsLoading && slots.length === 0 && (
                          <p className="text-sm text-soil/50 mt-4">No available times on this date.</p>
                        )}
                        {selectedDate && !slotsLoading && slots.length > 0 && (
                          <div>
                            <p className="text-xs text-soil/50 mb-3 font-medium">
                              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-CA", {
                                weekday: "long", month: "long", day: "numeric"
                              })}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {slots.map((slot) => (
                                <button
                                  key={slot}
                                  onClick={() => handleSlotSelect(slot)}
                                  className="py-2.5 rounded-xl border text-sm font-medium transition-all border-moss/30 text-soil hover:bg-moss hover:text-white hover:border-moss"
                                >
                                  {formatSlot(slot, userTz)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 3 — Your details ─────────────────────────────────── */}
                {step === 3 && selectedType && selectedSlot && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <button
                        onClick={() => { setStep(2); setSelectedSlot(null); }}
                        className="text-sm text-soil/50 hover:text-soil flex items-center gap-1"
                      >
                        ← Back
                      </button>
                      <h2 className="font-serif text-lg text-soil">Your details</h2>
                    </div>

                    <div className="bg-white rounded-2xl border border-linen p-5 mb-5 text-sm text-soil/70">
                      <p>
                        <strong className="text-soil">{selectedType.name}</strong>
                        {" · "}
                        {formatDate(selectedSlot, userTz)}
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => { e.preventDefault(); handleBook(); }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-soil mb-1.5">
                          Your name <span className="text-clay">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full name"
                          className="w-full px-4 py-3 rounded-xl border border-linen bg-white text-sm text-soil focus:outline-none focus:ring-2 focus:ring-moss/30"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-soil mb-1.5">
                          Email address <span className="text-clay">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full px-4 py-3 rounded-xl border border-linen bg-white text-sm text-soil focus:outline-none focus:ring-2 focus:ring-moss/30"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-soil mb-1.5">
                          Anything you&apos;d like me to know? <span className="text-soil/40 font-normal">(optional)</span>
                        </label>
                        <textarea
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Share your intention, what brought you here, or anything relevant…"
                          className="w-full px-4 py-3 rounded-xl border border-linen bg-white text-sm text-soil resize-none focus:outline-none focus:ring-2 focus:ring-moss/30"
                        />
                      </div>

                      {submitError && (
                        <p className="text-sm text-red-600">{submitError}</p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting || !name || !email}
                        className="w-full py-3.5 rounded-full bg-clay text-white font-medium text-sm hover:bg-clay/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Booking…" : "Book Session"}
                      </button>

                      {profile.cancellation_notice_hours > 0 && (
                        <p className="text-xs text-soil/40 text-center">
                          Cancellation notice: {profile.cancellation_notice_hours}h required
                        </p>
                      )}
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Select session", "Choose time", "Your details"];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const num = i + 1;
        const active = num === current;
        const done = num < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                  ${active ? "bg-moss text-white" : done ? "bg-moss/20 text-moss" : "bg-linen text-soil/40"}`}
              >
                {done ? "✓" : num}
              </div>
              <span
                className={`text-xs hidden sm:block ${active ? "text-soil font-medium" : "text-soil/40"}`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-4 h-px ${done ? "bg-moss/40" : "bg-linen"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
