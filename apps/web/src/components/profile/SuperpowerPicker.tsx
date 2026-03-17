"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Superpower {
  id: string;
  label: string;
}

interface SuperpowerPickerProps {
  userId: string;
  all: Superpower[];
  selected: Superpower[];
  onChange: (selected: Superpower[]) => void;
}

export function SuperpowerPicker({ userId, all, selected, onChange }: SuperpowerPickerProps) {
  const [search, setSearch] = useState("");
  const [allSuperpowers, setAllSuperpowers] = useState<Superpower[]>(all);

  const selectedIds = new Set(selected.map((s) => s.id));

  const filtered = allSuperpowers.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase())
  );
  const exactMatch = allSuperpowers.find(
    (s) => s.label.toLowerCase() === search.trim().toLowerCase()
  );
  const showAddCustom = search.trim().length > 2 && !exactMatch && selected.length < 8;

  function toggle(sp: Superpower) {
    if (selectedIds.has(sp.id)) {
      onChange(selected.filter((s) => s.id !== sp.id));
    } else if (selected.length < 8) {
      onChange([...selected, sp]);
    }
  }

  async function addCustom() {
    const label = search.trim();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("superpowers")
      .insert({ label, is_custom: true, created_by: userId })
      .select("id, label")
      .single();
    if (!error && data) {
      const sp = data as Superpower;
      setAllSuperpowers((prev) => [...prev, sp]);
      onChange([...selected, sp]);
      setSearch("");
    }
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selected.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-moss/10 text-moss border border-moss/20 hover:bg-moss/20 transition-colors"
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
        placeholder="Search or add superpowers…"
        className="w-full border border-linen rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30 bg-white mb-2"
      />

      <div className="max-h-48 overflow-y-auto rounded-xl border border-linen bg-white">
        {filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s)}
            disabled={!selectedIds.has(s.id) && selected.length >= 8}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-linen last:border-0 ${
              selectedIds.has(s.id)
                ? "bg-moss/10 text-moss"
                : "hover:bg-linen/50 text-charcoal/70 disabled:opacity-40"
            }`}
          >
            {s.label}
          </button>
        ))}

        {showAddCustom && (
          <button
            type="button"
            onClick={addCustom}
            className="w-full text-left px-4 py-2.5 text-sm text-clay hover:bg-clay/5 transition-colors"
          >
            + Add "{search.trim()}" as custom tag
          </button>
        )}

        {filtered.length === 0 && !showAddCustom && (
          <p className="px-4 py-3 text-sm text-charcoal/40">No matches found</p>
        )}
      </div>

      <p className="text-xs text-charcoal/40 mt-1">{selected.length}/8 selected</p>
    </div>
  );
}
