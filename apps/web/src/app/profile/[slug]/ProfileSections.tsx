"use client";

import { useState } from "react";
import { BookingFlow } from "./BookingFlow";

// ── Types ──────────────────────────────────────────────────────────────────────

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

interface Service {
  id: string;
  icon: string | null;
  name: string;
  description: string;
}

interface CommitmentLevel {
  label: string;
  months: number;
  discount_percent: number;
}

interface Plan {
  name: string;
  sessions_per_month: number;
  duration_minutes: number;
  monthly_price_cents: number;
  per_session_cents: number;
}

interface CommitmentPackage {
  id: string;
  heading: string;
  subheading: string | null;
  commitment_levels: CommitmentLevel[];
  plans: Plan[];
  billing_note: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDollars(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

function discounted(cents: number, pct: number): number {
  return Math.round(cents * (1 - pct / 100));
}

// ── Services Grid ──────────────────────────────────────────────────────────────

function ServicesGrid({ services }: { services: Service[] }) {
  if (services.length === 0) return null;

  return (
    <div id="offering" className="mb-10">
      <h2 className="font-serif italic text-2xl text-soil mb-6">Ways to Work Together</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {services.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl shadow-sm p-6">
            {s.icon && (
              <div className="w-12 h-12 rounded-full bg-moss/15 flex items-center justify-center text-xl mb-4">
                {s.icon}
              </div>
            )}
            <h3 className="font-semibold text-soil text-sm mb-1.5">{s.name}</h3>
            {s.description && (
              <p className="text-soil/60 text-xs leading-relaxed">{s.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Commitment Slider ──────────────────────────────────────────────────────────

function CommitmentSlider({
  pkg,
  onSelectPlan,
}: {
  pkg: CommitmentPackage;
  onSelectPlan: (note: string) => void;
}) {
  const [levelIdx, setLevelIdx] = useState(0);
  const level = pkg.commitment_levels[levelIdx]!;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
      <h2 className="font-serif italic text-xl text-soil mb-1">{pkg.heading}</h2>
      {pkg.subheading && (
        <p className="text-soil/60 text-sm mb-8 leading-relaxed max-w-xl">{pkg.subheading}</p>
      )}

      {/* Step slider */}
      <div className="mb-8">
        <div className="flex items-center gap-0">
          {pkg.commitment_levels.map((lvl, i) => {
            const isActive = i === levelIdx;
            const isPast = i < levelIdx;
            return (
              <div key={lvl.label} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => setLevelIdx(i)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 transition-colors flex items-center justify-center ${
                      isActive
                        ? "border-moss bg-moss"
                        : isPast
                          ? "border-moss bg-moss/40"
                          : "border-linen bg-white"
                    }`}
                  >
                    {(isActive || isPast) && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive ? "text-moss" : "text-soil/50 group-hover:text-soil"
                    }`}
                  >
                    {lvl.label}
                  </span>
                  {lvl.discount_percent > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-moss/10 text-moss font-semibold">
                      -{lvl.discount_percent}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-transparent select-none">·</span>
                  )}
                </button>
                {i < pkg.commitment_levels.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-colors ${
                      i < levelIdx ? "bg-moss/40" : "bg-linen"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing table */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full min-w-[400px] text-sm">
          <thead>
            <tr className="border-b border-linen">
              <th className="text-left py-2 px-2 text-xs font-semibold text-soil/50 uppercase tracking-wide">Plan</th>
              <th className="text-left py-2 px-2 text-xs font-semibold text-soil/50 uppercase tracking-wide">Sessions</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-soil/50 uppercase tracking-wide">Monthly</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-soil/50 uppercase tracking-wide">Per Session</th>
              <th className="py-2 px-2" />
            </tr>
          </thead>
          <tbody>
            {pkg.plans.map((plan) => {
              const monthly = discounted(plan.monthly_price_cents, level.discount_percent);
              const perSession = discounted(plan.per_session_cents, level.discount_percent);
              const note = `Interested in: ${plan.name} · ${level.label} · ${fmtDollars(monthly)}/month`;

              return (
                <tr key={plan.name} className="border-b border-linen/60 last:border-0 hover:bg-cream/50 transition-colors">
                  <td className="py-3.5 px-2 font-medium text-soil">{plan.name}</td>
                  <td className="py-3.5 px-2 text-soil/60">
                    {plan.sessions_per_month} × {plan.duration_minutes} min/month
                  </td>
                  <td className="py-3.5 px-2 text-right">
                    <span className="font-semibold text-soil">{fmtDollars(monthly)}</span>
                    {level.discount_percent > 0 && (
                      <span className="text-xs text-soil/30 line-through ml-1.5">
                        {fmtDollars(plan.monthly_price_cents)}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-2 text-right">
                    <span className="text-soil/70">{fmtDollars(perSession)}</span>
                  </td>
                  <td className="py-3.5 px-2">
                    <button
                      onClick={() => onSelectPlan(note)}
                      className="text-xs px-3 py-1.5 rounded-full bg-clay/10 text-clay hover:bg-clay hover:text-white transition-colors font-medium whitespace-nowrap"
                    >
                      Select
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pkg.billing_note && (
        <p className="text-xs text-soil/40 mt-4">{pkg.billing_note}</p>
      )}
    </div>
  );
}

// ── Main exported component ────────────────────────────────────────────────────

export function ProfileSections({
  services,
  commitmentPackages,
  slug,
  sessionTypes,
  availabilityDays,
  cancellationNoticeHours,
}: {
  services: Service[];
  commitmentPackages: CommitmentPackage[];
  slug: string;
  sessionTypes: SessionType[];
  availabilityDays: number[];
  cancellationNoticeHours: number;
}) {
  const [selectedPlanNote, setSelectedPlanNote] = useState<string | undefined>(undefined);

  return (
    <section className="bg-cream py-16">
      <div className="max-w-6xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">

          {/* ── Left: scrollable content ─────────────────────────────────── */}
          <div className="order-2 lg:order-1">
            <ServicesGrid services={services} />

            {commitmentPackages.map((pkg) => (
              <CommitmentSlider key={pkg.id} pkg={pkg} onSelectPlan={setSelectedPlanNote} />
            ))}
          </div>

          {/* ── Right: sticky booking sidebar ────────────────────────────── */}
          <div id="book" className="order-1 lg:order-2 lg:sticky lg:top-20 lg:self-start bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-serif text-lg text-soil mb-5">Book a Session</h2>
            <BookingFlow
              slug={slug}
              sessionTypes={sessionTypes}
              availabilityDays={availabilityDays}
              cancellationNoticeHours={cancellationNoticeHours}
              selectedPlanNote={selectedPlanNote}
            />
          </div>

        </div>
      </div>
    </section>
  );
}
