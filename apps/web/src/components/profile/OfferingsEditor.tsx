"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const EMOJI_OPTIONS = [
  "🌱", "🍞", "🌿", "🌻", "🍄", "🐝", "🪵", "🌾",
  "🧵", "🥕", "🪴", "🫙", "🌊", "🔥", "✨", "🌙",
  "🍯", "🪻", "🌲", "🫚",
];

interface Offering {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  display_order: number;
}

interface OfferingsEditorProps {
  profileId: string;
  initial: Offering[];
}

export function OfferingsEditor({ profileId, initial }: OfferingsEditorProps) {
  const [offerings, setOfferings] = useState<Offering[]>(initial);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = createClient();

  function scheduleUpdate(offering: Offering) {
    if (saveTimers.current[offering.id]) clearTimeout(saveTimers.current[offering.id]);
    saveTimers.current[offering.id] = setTimeout(async () => {
      setSaving((p) => ({ ...p, [offering.id]: true }));
      await supabase
        .from("offerings")
        .update({
          title: offering.title,
          description: offering.description,
          icon: offering.icon,
        })
        .eq("id", offering.id);
      setSaving((p) => ({ ...p, [offering.id]: false }));
    }, 500);
  }

  function update(id: string, key: keyof Offering, value: string | null) {
    setOfferings((prev) => {
      const updated = prev.map((o) => (o.id === id ? { ...o, [key]: value } : o));
      const offering = updated.find((o) => o.id === id);
      if (offering) scheduleUpdate(offering);
      return updated;
    });
  }

  async function addOffering() {
    if (offerings.length >= 6) return;
    const { data, error } = await supabase
      .from("offerings")
      .insert({
        profile_id: profileId,
        title: "",
        icon: "🌱",
        display_order: offerings.length,
      })
      .select()
      .single();
    if (!error && data) {
      setOfferings((prev) => [...prev, data as Offering]);
    }
  }

  async function removeOffering(id: string) {
    if (!confirm("Remove this offering?")) return;
    await supabase.from("offerings").delete().eq("id", id);
    setOfferings((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <div className="space-y-4">
      {offerings.map((o) => (
        <OfferingCard
          key={o.id}
          offering={o}
          saving={!!saving[o.id]}
          onUpdate={(key, value) => update(o.id, key, value)}
          onRemove={() => removeOffering(o.id)}
        />
      ))}

      {offerings.length < 6 && (
        <button
          type="button"
          onClick={addOffering}
          className="w-full border-2 border-dashed border-linen rounded-2xl py-4 text-sm text-charcoal/40 hover:border-clay/30 hover:text-clay transition-colors"
        >
          + Add an offering
        </button>
      )}
    </div>
  );
}

function OfferingCard({
  offering,
  saving,
  onUpdate,
  onRemove,
}: {
  offering: Offering;
  saving: boolean;
  onUpdate: (key: keyof Offering, value: string | null) => void;
  onRemove: () => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const inputClass =
    "w-full border border-linen rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30 bg-white";

  return (
    <div className="bg-white border border-linen rounded-2xl p-4">
      <div className="flex items-start gap-3">
        {/* Emoji picker */}
        <div className="relative" ref={emojiRef}>
          <button
            type="button"
            onClick={() => setShowEmoji((s) => !s)}
            className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl hover:bg-linen transition-colors"
          >
            {offering.icon || "🌱"}
          </button>
          {showEmoji && (
            <div className="absolute z-10 top-full left-0 mt-1 bg-white border border-linen rounded-xl p-2 grid grid-cols-5 gap-1 w-44 shadow-lg">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => { onUpdate("icon", emoji); setShowEmoji(false); }}
                  className="text-xl w-8 h-8 flex items-center justify-center hover:bg-linen rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={offering.title}
            onChange={(e) => onUpdate("title", e.target.value)}
            placeholder="Offering title"
            className={`${inputClass} mb-2`}
          />
          <textarea
            value={offering.description ?? ""}
            onChange={(e) => onUpdate("description", e.target.value || null)}
            placeholder="Describe what you're offering…"
            rows={2}
            className={`${inputClass} resize-none`}
          />
          {saving && <p className="text-xs text-charcoal/40 mt-1">Saving…</p>}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-charcoal/30 hover:text-red-400 transition-colors text-xl mt-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}
