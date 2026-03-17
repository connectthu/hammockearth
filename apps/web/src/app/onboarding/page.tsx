"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

interface OfferingDraft {
  title: string;
  description: string;
  icon: string;
}

interface FormState {
  full_name: string;
  username: string;
  location: string;
  bio: string;
  superpowers: { id: string; label: string }[];
  offerings: OfferingDraft[];
  social_links: { instagram: string; website: string; substack: string; other: string };
  profile_visibility: "members_only" | "public";
}

// ── Constants ─────────────────────────────────────────────────────────────

const RESERVED = ["profile", "dashboard", "login", "checkout", "logout", "onboarding"];

const TOTAL_STEPS = 7;

function suggestUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 25);
}

// ── Progress dots ─────────────────────────────────────────────────────────

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${
            i < step
              ? "w-2 h-2 bg-clay"
              : i === step
              ? "w-3 h-3 bg-clay"
              : "w-2 h-2 border border-linen bg-white"
          }`}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [allSuperpowers, setAllSuperpowers] = useState<{ id: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<FormState>({
    full_name: "",
    username: "",
    location: "",
    bio: "",
    superpowers: [],
    offerings: [],
    social_links: { instagram: "", website: "", substack: "", other: "" },
    profile_visibility: "members_only",
  });

  // Load user info + predefined superpowers on mount
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/members/login"); return; }
      setUserId(user.id);

      const name = user.user_metadata?.full_name ?? "";
      setFirstName(name.split(" ")[0] ?? "");
      setForm((f) => ({
        ...f,
        full_name: name,
        username: suggestUsername(name),
      }));

      const { data } = await supabase
        .from("superpowers")
        .select("id, label")
        .eq("is_custom", false)
        .order("label");
      if (data) setAllSuperpowers(data as { id: string; label: string }[]);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced username check
  useEffect(() => {
    const val = form.username.trim();
    if (!val) { setUsernameStatus("idle"); return; }

    // Validate format
    if (!/^[a-z0-9-]{3,30}$/.test(val)) { setUsernameStatus("invalid"); return; }
    if (RESERVED.includes(val)) { setUsernameStatus("invalid"); return; }

    setUsernameStatus("checking");
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", val)
        .neq("id", userId ?? "")
        .maybeSingle();
      setUsernameStatus(data ? "taken" : "ok");
    }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.username, userId]);

  const set = (key: keyof FormState, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const inputClass =
    "w-full border border-linen rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30 bg-white";
  const labelClass =
    "block text-xs font-medium text-moss uppercase tracking-wide mb-1.5";

  // ── Save on final step ─────────────────────────────────────────────────

  async function save() {
    if (!userId) return;
    setSaving(true);
    setSaveError(null);

    try {
      // 1. Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          username: form.username || null,
          location: form.location || null,
          bio: form.bio || null,
          social_links: Object.fromEntries(
            Object.entries(form.social_links).filter(([, v]) => v.trim() !== "")
          ),
          profile_visibility: form.profile_visibility,
          onboarding_complete: true,
        } as any)
        .eq("id", userId);

      if (profileError) throw profileError;

      // 2. Insert superpowers
      if (form.superpowers.length > 0) {
        await supabase
          .from("profile_superpowers")
          .insert(
            form.superpowers.map((s) => ({ profile_id: userId, superpower_id: s.id }))
          );
      }

      // 3. Insert offerings
      if (form.offerings.length > 0) {
        await supabase
          .from("offerings")
          .insert(
            form.offerings.map((o, i) => ({
              profile_id: userId,
              title: o.title,
              description: o.description || null,
              icon: o.icon || null,
              display_order: i,
            }))
          );
      }
    } catch (err: any) {
      setSaveError(err?.message ?? "Something went wrong. Please try again.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setStep(6);
  }

  // ── Steps ──────────────────────────────────────────────────────────────

  function Step0Welcome() {
    return (
      <div className="text-center">
        <div className="text-5xl mb-6">🌱</div>
        <h1 className="font-serif text-3xl text-soil mb-3">
          Welcome{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="text-charcoal/60 mb-8 leading-relaxed">
          Let's set up your Hammock Earth profile so the community can get to know you.
          This takes about 2 minutes.
        </p>
        <button
          onClick={() => setStep(1)}
          className="w-full bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors"
        >
          Let's go →
        </button>
      </div>
    );
  }

  function Step1About() {
    const usernameOk = usernameStatus === "ok";
    const canProceed = form.full_name.trim().length > 0 && usernameOk;

    return (
      <div>
        <h2 className="font-serif text-2xl text-soil mb-6">About you</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Your name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => {
                set("full_name", e.target.value);
                if (!form.username || form.username === suggestUsername(form.full_name)) {
                  set("username", suggestUsername(e.target.value));
                }
              }}
              placeholder="Full name"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40 text-sm">@</span>
              <input
                type="text"
                value={form.username}
                onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-username"
                className={`${inputClass} pl-8`}
              />
            </div>
            {usernameStatus === "checking" && (
              <p className="text-xs text-charcoal/40 mt-1">Checking availability…</p>
            )}
            {usernameStatus === "ok" && (
              <p className="text-xs text-moss mt-1">✓ Available</p>
            )}
            {usernameStatus === "taken" && (
              <p className="text-xs text-red-500 mt-1">Already taken — try another</p>
            )}
            {usernameStatus === "invalid" && (
              <p className="text-xs text-red-500 mt-1">3–30 lowercase letters, numbers, hyphens only</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Location <span className="normal-case text-charcoal/40">(optional)</span></label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Ontario, Canada"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Bio <span className="normal-case text-charcoal/40">(optional)</span></label>
            <textarea
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="A few sentences about you and what you're into…"
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => setStep(0)}
            className="px-5 py-2.5 rounded-full border border-linen text-sm text-charcoal/60 hover:border-clay/30 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => setStep(2)}
            disabled={!canProceed}
            className="flex-1 bg-clay text-white font-medium py-2.5 px-6 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    );
  }

  function Step2Superpowers() {
    const [search, setSearch] = useState("");

    const filtered = allSuperpowers.filter((s) =>
      s.label.toLowerCase().includes(search.toLowerCase())
    );
    const selected = form.superpowers;
    const selectedIds = new Set(selected.map((s) => s.id));
    const exactMatch = allSuperpowers.find(
      (s) => s.label.toLowerCase() === search.toLowerCase()
    );
    const showAddCustom = search.trim().length > 2 && !exactMatch && selected.length < 8;

    function toggle(sp: { id: string; label: string }) {
      if (selectedIds.has(sp.id)) {
        set("superpowers", selected.filter((s) => s.id !== sp.id));
      } else if (selected.length < 8) {
        set("superpowers", [...selected, sp]);
      }
    }

    async function addCustom() {
      if (!userId) return;
      const label = search.trim();
      const { data, error } = await supabase
        .from("superpowers")
        .insert({ label, is_custom: true, created_by: userId })
        .select("id, label")
        .single();
      if (!error && data) {
        setAllSuperpowers((prev) => [...prev, data as { id: string; label: string }]);
        set("superpowers", [...selected, data as { id: string; label: string }]);
        setSearch("");
      }
    }

    return (
      <div>
        <h2 className="font-serif text-2xl text-soil mb-2">Your Superpowers</h2>
        <p className="text-sm text-charcoal/50 mb-5">Pick up to 8 skills you love sharing.</p>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map((s) => (
              <button
                key={s.id}
                onClick={() => toggle(s)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-clay/10 text-clay border border-clay/20 hover:bg-clay/20 transition-colors"
              >
                {s.label} <span className="text-xs">×</span>
              </button>
            ))}
          </div>
        )}

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search superpowers…"
          className={`${inputClass} mb-3`}
        />

        <div className="max-h-48 overflow-y-auto space-y-1">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => toggle(s)}
              disabled={!selectedIds.has(s.id) && selected.length >= 8}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                selectedIds.has(s.id)
                  ? "bg-clay/10 text-clay"
                  : "hover:bg-linen text-charcoal/70 disabled:opacity-40"
              }`}
            >
              {s.label}
            </button>
          ))}

          {showAddCustom && (
            <button
              onClick={addCustom}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-moss hover:bg-moss/10 transition-colors"
            >
              + Add "{search.trim()}" as custom tag
            </button>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => setStep(1)}
            className="px-5 py-2.5 rounded-full border border-linen text-sm text-charcoal/60 hover:border-clay/30 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => setStep(3)}
            className="flex-1 bg-clay text-white font-medium py-2.5 px-6 rounded-full hover:bg-clay/90 transition-colors"
          >
            {selected.length > 0 ? "Next →" : "Skip for now →"}
          </button>
        </div>
      </div>
    );
  }

  function Step3Offerings() {
    const EMOJI_OPTIONS = ["🌱", "🍞", "🌿", "🌻", "🍄", "🐝", "🪵", "🌾", "🧵", "🥕", "🪴", "🫙", "🌊", "🔥", "✨", "🌙", "🍯", "🪻", "🌲", "🫚"];

    function addOffering() {
      if (form.offerings.length >= 3) return;
      set("offerings", [...form.offerings, { title: "", description: "", icon: "🌱" }]);
    }

    function updateOffering(i: number, key: keyof OfferingDraft, value: string) {
      const updated = form.offerings.map((o, idx) =>
        idx === i ? { ...o, [key]: value } : o
      );
      set("offerings", updated);
    }

    function removeOffering(i: number) {
      set("offerings", form.offerings.filter((_, idx) => idx !== i));
    }

    return (
      <div>
        <h2 className="font-serif text-2xl text-soil mb-2">What you love to give</h2>
        <p className="text-sm text-charcoal/50 mb-5">
          Share skills, trades, or knowledge you'd offer to the community. Up to 3.
        </p>

        <div className="space-y-4">
          {form.offerings.map((o, i) => (
            <div key={i} className="bg-white border border-linen rounded-2xl p-4">
              <div className="flex items-start gap-3">
                {/* Emoji picker */}
                <div className="relative group">
                  <button className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-linen transition-colors">
                    {o.icon || "🌱"}
                  </button>
                  <div className="absolute z-10 top-full left-0 mt-1 bg-white border border-linen rounded-xl p-2 hidden group-focus-within:grid grid-cols-5 gap-1 w-44 shadow-lg">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => updateOffering(i, "icon", emoji)}
                        className="text-xl w-8 h-8 flex items-center justify-center hover:bg-linen rounded-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={o.title}
                    onChange={(e) => updateOffering(i, "title", e.target.value)}
                    placeholder="e.g. Sourdough starter swap"
                    className={`${inputClass} mb-2`}
                  />
                  <textarea
                    value={o.description}
                    onChange={(e) => updateOffering(i, "description", e.target.value)}
                    placeholder="Describe what you're offering…"
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <button
                  onClick={() => removeOffering(i)}
                  className="text-charcoal/30 hover:text-red-400 transition-colors text-lg mt-1"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {form.offerings.length < 3 && (
            <button
              onClick={addOffering}
              className="w-full border-2 border-dashed border-linen rounded-2xl py-4 text-sm text-charcoal/40 hover:border-clay/30 hover:text-clay transition-colors"
            >
              + Add an offering
            </button>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => setStep(2)}
            className="px-5 py-2.5 rounded-full border border-linen text-sm text-charcoal/60 hover:border-clay/30 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => setStep(4)}
            className="flex-1 bg-clay text-white font-medium py-2.5 px-6 rounded-full hover:bg-clay/90 transition-colors"
          >
            {form.offerings.length > 0 ? "Next →" : "Skip for now →"}
          </button>
        </div>
      </div>
    );
  }

  function Step4Social() {
    const fields = [
      { key: "instagram" as const, label: "Instagram", placeholder: "@yourhandle" },
      { key: "website" as const, label: "Website", placeholder: "https://yoursite.com" },
      { key: "substack" as const, label: "Substack", placeholder: "yourname.substack.com" },
      { key: "other" as const, label: "Other link", placeholder: "https://…" },
    ];

    return (
      <div>
        <h2 className="font-serif text-2xl text-soil mb-2">Find me online</h2>
        <p className="text-sm text-charcoal/50 mb-5">Share where people can follow your work.</p>

        <div className="space-y-4">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input
                type="text"
                value={form.social_links[key]}
                onChange={(e) =>
                  set("social_links", { ...form.social_links, [key]: e.target.value })
                }
                placeholder={placeholder}
                className={inputClass}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => setStep(3)}
            className="px-5 py-2.5 rounded-full border border-linen text-sm text-charcoal/60 hover:border-clay/30 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={() => setStep(5)}
            className="flex-1 bg-clay text-white font-medium py-2.5 px-6 rounded-full hover:bg-clay/90 transition-colors"
          >
            {Object.values(form.social_links).some((v) => v.trim()) ? "Next →" : "Skip for now →"}
          </button>
        </div>
      </div>
    );
  }

  function Step5Visibility() {
    return (
      <div>
        <h2 className="font-serif text-2xl text-soil mb-2">Profile visibility</h2>
        <p className="text-sm text-charcoal/50 mb-6">Who can see your profile?</p>

        <div className="space-y-3">
          {[
            {
              value: "members_only" as const,
              title: "Members only",
              desc: "Only logged-in Hammock Earth members can view your profile.",
            },
            {
              value: "public" as const,
              title: "Public",
              desc: "Anyone with the link can view your profile — great for sharing.",
            },
          ].map(({ value, title, desc }) => (
            <button
              key={value}
              onClick={() => set("profile_visibility", value)}
              className={`w-full text-left border rounded-2xl p-4 transition-colors ${
                form.profile_visibility === value
                  ? "border-clay bg-clay/5"
                  : "border-linen hover:border-clay/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  form.profile_visibility === value ? "border-clay" : "border-linen"
                }`}>
                  {form.profile_visibility === value && (
                    <div className="w-2 h-2 rounded-full bg-clay" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-soil text-sm">{title}</p>
                  <p className="text-xs text-charcoal/50 mt-0.5">{desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {saveError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mt-4">{saveError}</p>
        )}

        <div className="flex gap-3 mt-8">
          <button
            onClick={() => setStep(4)}
            className="px-5 py-2.5 rounded-full border border-linen text-sm text-charcoal/60 hover:border-clay/30 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-clay text-white font-medium py-2.5 px-6 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Finish setup →"}
          </button>
        </div>
      </div>
    );
  }

  function Step6Done() {
    return (
      <div className="text-center">
        <div className="text-5xl mb-6">🎉</div>
        <h2 className="font-serif text-3xl text-soil mb-3">You're all set!</h2>
        <p className="text-charcoal/60 mb-8 leading-relaxed">
          Your Hammock Earth profile is ready. You can update it anytime from your dashboard.
        </p>
        <div className="space-y-3">
          <a
            href={form.username ? `/members/${form.username}` : "/members/profile/edit"}
            className="block w-full bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors text-center"
          >
            View my profile →
          </a>
          <a
            href="/members/dashboard"
            className="block w-full border border-linen text-charcoal/60 font-medium py-3 px-6 rounded-full hover:border-clay/30 transition-colors text-center"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }

  const steps = [Step0Welcome, Step1About, Step2Superpowers, Step3Offerings, Step4Social, Step5Visibility, Step6Done];
  const CurrentStep = steps[step];

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {step > 0 && step < 6 && (
          <ProgressDots step={step - 1} total={5} />
        )}
        <div className="bg-white rounded-3xl border border-linen p-8 shadow-sm">
          <CurrentStep />
        </div>
      </div>
    </div>
  );
}
