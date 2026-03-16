"use client";

import { useEffect } from "react";

interface DateTimePickerProps {
  value: string; // "YYYY-MM-DDTHH:MM" or ""
  onChange: (value: string) => void;
  required?: boolean;
}

const TIME_OPTIONS: { val: string; label: string }[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const period = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    TIME_OPTIONS.push({ val, label: `${h12}:${String(m).padStart(2, "0")} ${period}` });
  }
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const inputClass =
  "px-4 py-2.5 rounded-xl border border-linen bg-white focus:outline-none focus:ring-2 focus:ring-clay/30 text-sm";

export function DateTimePicker({ value, onChange, required }: DateTimePickerProps) {
  // Default to today + 9:00 AM on mount if no value provided
  useEffect(() => {
    if (!value) {
      onChange(`${todayStr()}T09:00`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const datePart = value ? value.slice(0, 10) : todayStr();
  const timePart = value && value.length >= 16 ? value.slice(11, 16) : "09:00";

  function handleDate(newDate: string) {
    if (!newDate) { onChange(""); return; }
    onChange(`${newDate}T${timePart}`);
  }

  function handleTime(newTime: string) {
    onChange(`${datePart}T${newTime}`);
  }

  return (
    <div className="flex gap-2">
      <input
        type="date"
        required={required}
        value={datePart}
        onChange={(e) => handleDate(e.target.value)}
        className={`flex-1 ${inputClass}`}
      />
      <select
        value={timePart}
        onChange={(e) => handleTime(e.target.value)}
        className={`w-36 ${inputClass} cursor-pointer`}
      >
        {TIME_OPTIONS.map(({ val, label }) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>
    </div>
  );
}
