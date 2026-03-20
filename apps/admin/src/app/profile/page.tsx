"use client";

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface BookableProfile {
  id: string;
  user_id: string;
  slug: string;
  headline: string;
  subheading: string;
  about: string;
  avatar_url: string | null;
  is_published: boolean;
  buffer_minutes: number;
  cancellation_notice_hours: number;
}

interface SessionType {
  id: string;
  profile_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  location_type: "zoom" | "in_person" | "phone";
  location_detail: string | null;
  price_cents: number;
  is_free: boolean;
  is_active: boolean;
  display_order: number;
}

interface Schedule {
  id: string;
  profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
}

interface Override {
  id: string;
  profile_id: string;
  date: string;
  is_unavailable: boolean;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
}

interface Booking {
  id: string;
  booker_name: string;
  booker_email: string;
  booker_notes: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  location_type: string;
  status: "confirmed" | "cancelled";
  cancellation_token: string;
  session_types: { name: string; duration_minutes: number } | null;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TIMEZONES = [
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "UTC",
];

function formatDateTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  role: string;
  avatar_url: string | null;
  bio: string | null;
}

// ── Tab: Profile Details ──────────────────────────────────────────────────────

function ProfileTab({
  profile,
  onChange,
}: {
  profile: BookableProfile | null;
  onChange: (p: BookableProfile) => void;
}) {
  const [form, setForm] = useState<Partial<BookableProfile>>({
    slug: "",
    headline: "",
    subheading: "",
    about: "",
    avatar_url: "",
    is_published: false,
    buffer_minutes: 15,
    cancellation_notice_hours: 0,
  });
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm(profile);
    } else {
      // Load users so admin can pick who gets the bookable profile
      apiGet<UserOption[]>("/memberships/users")
        .then((data) => setUsers(data))
        .catch(() => {});
    }
  }, [profile]);

  const set = (key: keyof BookableProfile, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!profile && !form.user_id) {
      alert("Please select a user for this booking profile.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (profile?.id) payload.id = profile.id;
      const updated = await apiPost<BookableProfile>("/booking/admin/profile", payload);
      onChange(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-soil">Profile Details</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-soil/60">Published</span>
          <div
            onClick={() => set("is_published", !form.is_published)}
            className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${form.is_published ? "bg-moss" : "bg-linen border border-soil/20"}`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_published ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </div>
        </label>
      </div>

      {!profile && (
        <Field label="Member">
          <select
            value={(form.user_id as string) ?? ""}
            onChange={(e) => {
              const u = users.find((x) => x.id === e.target.value);
              if (!u) { set("user_id", ""); return; }
              setForm((f) => ({
                ...f,
                user_id: u.id,
                slug: u.username ?? f.slug ?? "",
                avatar_url: u.avatar_url ?? f.avatar_url ?? "",
                about: u.bio ?? f.about ?? "",
              }));
            }}
            className={inputCls}
          >
            <option value="">— Select a member —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? u.email}
                {u.username ? ` (@${u.username})` : ""} · {u.role}
              </option>
            ))}
          </select>
          {form.user_id && (
            <p className="text-xs text-moss mt-1">
              ✓ Slug, avatar, and bio pre-filled from profile — edit below if needed
            </p>
          )}
        </Field>
      )}

      {profile && (
        <p className="text-xs text-soil/40">
          User ID: <span className="font-mono">{profile.user_id}</span>
        </p>
      )}

      <Field label="URL slug (e.g. 'thu' → /profile/thu)">
        <input
          type="text"
          value={(form.slug as string) ?? ""}
          onChange={(e) => set("slug", e.target.value)}
          placeholder="thu"
          className={inputCls}
        />
      </Field>

      <Field label="Headline">
        <input
          type="text"
          value={(form.headline as string) ?? ""}
          onChange={(e) => set("headline", e.target.value)}
          placeholder="Begin your intentional journey."
          className={inputCls}
        />
      </Field>

      <Field label="Subheading">
        <input
          type="text"
          value={(form.subheading as string) ?? ""}
          onChange={(e) => set("subheading", e.target.value)}
          placeholder="Short description shown below headline"
          className={inputCls}
        />
      </Field>

      <Field label="About (short bio)">
        <textarea
          rows={3}
          value={(form.about as string) ?? ""}
          onChange={(e) => set("about", e.target.value)}
          placeholder="A short paragraph shown on the booking page"
          className={`${inputCls} resize-none`}
        />
      </Field>

      <Field label="Avatar URL">
        <input
          type="text"
          value={(form.avatar_url as string) ?? ""}
          onChange={(e) => set("avatar_url", e.target.value)}
          placeholder="https://…"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Buffer between bookings (min)">
          <input
            type="number"
            min={0}
            value={form.buffer_minutes ?? 15}
            onChange={(e) => set("buffer_minutes", parseInt(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="Cancellation notice (hours)">
          <input
            type="number"
            min={0}
            value={form.cancellation_notice_hours ?? 0}
            onChange={(e) => set("cancellation_notice_hours", parseInt(e.target.value))}
            className={inputCls}
          />
        </Field>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-5 py-2.5 rounded-full bg-clay text-white text-sm font-medium hover:bg-clay/90 transition-colors disabled:opacity-50"
      >
        {saved ? "Saved ✓" : saving ? "Saving…" : "Save Profile"}
      </button>
    </div>
  );
}

// ── Tab: Session Types ────────────────────────────────────────────────────────

function SessionTypesTab({ profileId }: { profileId: string }) {
  const [types, setTypes] = useState<SessionType[]>([]);
  const [editing, setEditing] = useState<Partial<SessionType> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<SessionType[]>(`/booking/admin/profile/${profileId}/session-types`);
      setTypes(data);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  const blankType = (): Partial<SessionType> => ({
    name: "",
    description: "",
    duration_minutes: 60,
    location_type: "zoom",
    location_detail: "",
    price_cents: 0,
    is_free: false,
    is_active: true,
    display_order: types.length,
  });

  const handleSave = async () => {
    if (!editing) return;
    try {
      await apiPost(`/booking/admin/profile/${profileId}/session-types`, editing);
      setEditing(null);
      load();
    } catch {
      alert("Failed to save session type");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this session type?")) return;
    try {
      await apiDelete(`/booking/admin/session-types/${id}`);
      load();
    } catch {
      alert("Failed to delete");
    }
  };

  if (loading) return <p className="text-sm text-soil/50">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-soil">Session Types</h2>
        <button
          onClick={() => setEditing(blankType())}
          className="px-4 py-2 rounded-full bg-clay text-white text-sm font-medium hover:bg-clay/90 transition-colors"
        >
          + Add session type
        </button>
      </div>

      {types.length === 0 && !editing && (
        <p className="text-sm text-soil/40">No session types yet.</p>
      )}

      <div className="space-y-3">
        {types.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-xl border border-linen p-4 flex items-start justify-between gap-4"
          >
            <div className="space-y-1 flex-1">
              <p className="font-medium text-soil text-sm">{t.name}</p>
              <p className="text-xs text-soil/50">
                {t.duration_minutes} min ·{" "}
                {t.location_type === "zoom" ? "🎥 Zoom" : t.location_type === "phone" ? "📞 Phone" : `📍 ${t.location_detail ?? "In person"}`}
                {t.is_free ? " · FREE" : t.price_cents > 0 ? ` · $${(t.price_cents / 100).toFixed(0)}` : ""}
              </p>
              {t.description && <p className="text-xs text-soil/40">{t.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setEditing(t)}
                className="text-xs px-3 py-1.5 rounded-lg border border-linen hover:bg-linen text-soil/60 hover:text-soil transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="bg-white rounded-xl border border-moss/20 p-5 space-y-4 max-w-lg">
          <h3 className="font-medium text-soil text-sm">{editing.id ? "Edit session type" : "New session type"}</h3>

          <Field label="Name">
            <input type="text" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} placeholder="Discovery Call" />
          </Field>

          <Field label="Description (optional)">
            <textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={`${inputCls} resize-none`} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (minutes)">
              <input type="number" min={15} value={editing.duration_minutes ?? 60} onChange={(e) => setEditing({ ...editing, duration_minutes: parseInt(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Location type">
              <select value={editing.location_type ?? "zoom"} onChange={(e) => setEditing({ ...editing, location_type: e.target.value as SessionType["location_type"] })} className={inputCls}>
                <option value="zoom">🎥 Zoom</option>
                <option value="in_person">📍 In person</option>
                <option value="phone">📞 Phone</option>
              </select>
            </Field>
          </div>

          {editing.location_type !== "zoom" && (
            <Field label="Location detail">
              <input type="text" value={editing.location_detail ?? ""} onChange={(e) => setEditing({ ...editing, location_detail: e.target.value })} className={inputCls} placeholder="Full address or meeting instructions" />
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (cents, 0 for free)">
              <input type="number" min={0} value={editing.price_cents ?? 0} onChange={(e) => setEditing({ ...editing, price_cents: parseInt(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Display order">
              <input type="number" min={0} value={editing.display_order ?? 0} onChange={(e) => setEditing({ ...editing, display_order: parseInt(e.target.value) })} className={inputCls} />
            </Field>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={editing.is_free ?? false} onChange={(e) => setEditing({ ...editing, is_free: e.target.checked })} className="rounded" />
            <span className="text-sm text-soil">Show as FREE</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="rounded" />
            <span className="text-sm text-soil">Active (visible to bookers)</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="px-4 py-2 rounded-full bg-clay text-white text-sm font-medium hover:bg-clay/90">Save</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-full border border-linen text-soil text-sm hover:bg-linen">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Availability ─────────────────────────────────────────────────────────

function AvailabilityTab({ profileId }: { profileId: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSchedule, setNewSchedule] = useState<Partial<Schedule>>({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
    timezone: "America/Toronto",
  });
  const [newOverride, setNewOverride] = useState<Partial<Override>>({
    date: "",
    is_unavailable: true,
    start_time: null,
    end_time: null,
    note: "",
  });
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([
        apiGet<Schedule[]>(`/booking/admin/profile/${profileId}/schedules`),
        apiGet<Override[]>(`/booking/admin/profile/${profileId}/overrides`),
      ]);
      setSchedules(s);
      setOverrides(o);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  const addSchedule = async () => {
    try {
      await apiPost(`/booking/admin/profile/${profileId}/schedules`, newSchedule);
      setShowScheduleForm(false);
      load();
    } catch { alert("Failed to add schedule"); }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await apiDelete(`/booking/admin/schedules/${id}`);
      load();
    } catch { alert("Failed to delete"); }
  };

  const addOverride = async () => {
    try {
      const payload = {
        ...newOverride,
        start_time: newOverride.is_unavailable ? null : newOverride.start_time,
        end_time: newOverride.is_unavailable ? null : newOverride.end_time,
      };
      await apiPost(`/booking/admin/profile/${profileId}/overrides`, payload);
      setShowOverrideForm(false);
      load();
    } catch { alert("Failed to add override"); }
  };

  const deleteOverride = async (id: string) => {
    try {
      await apiDelete(`/booking/admin/overrides/${id}`);
      load();
    } catch { alert("Failed to delete"); }
  };

  if (loading) return <p className="text-sm text-soil/50">Loading…</p>;

  return (
    <div className="space-y-8">
      {/* Weekly schedules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg text-soil">Weekly Availability</h2>
            <p className="text-xs text-soil/40 mt-0.5">Recurring hours when you&apos;re available each week</p>
          </div>
          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="px-4 py-2 rounded-full bg-clay text-white text-sm font-medium hover:bg-clay/90 transition-colors"
          >
            + Add hours
          </button>
        </div>

        {schedules.length === 0 && !showScheduleForm && (
          <p className="text-sm text-soil/40">No weekly hours set yet.</p>
        )}

        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-white rounded-xl border border-linen px-4 py-3">
              <div>
                <span className="font-medium text-sm text-soil">{DAY_NAMES[s.day_of_week]}</span>
                <span className="text-sm text-soil/60 ml-3">
                  {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                </span>
                <span className="text-xs text-soil/40 ml-2">({s.timezone})</span>
              </div>
              <button onClick={() => deleteSchedule(s.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
            </div>
          ))}
        </div>

        {showScheduleForm && (
          <div className="bg-white rounded-xl border border-moss/20 p-4 space-y-3 max-w-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Day">
                <select value={newSchedule.day_of_week ?? 1} onChange={(e) => setNewSchedule({ ...newSchedule, day_of_week: parseInt(e.target.value) })} className={inputCls}>
                  {DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </Field>
              <Field label="Timezone">
                <select value={newSchedule.timezone ?? "America/Toronto"} onChange={(e) => setNewSchedule({ ...newSchedule, timezone: e.target.value })} className={inputCls}>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start time">
                <input type="time" value={newSchedule.start_time ?? "09:00"} onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })} className={inputCls} />
              </Field>
              <Field label="End time">
                <input type="time" value={newSchedule.end_time ?? "17:00"} onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <div className="flex gap-2">
              <button onClick={addSchedule} className="px-4 py-2 rounded-full bg-clay text-white text-sm">Add</button>
              <button onClick={() => setShowScheduleForm(false)} className="px-4 py-2 rounded-full border border-linen text-soil text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Date overrides */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg text-soil">Date Overrides</h2>
            <p className="text-xs text-soil/40 mt-0.5">Block specific dates or add one-off availability</p>
          </div>
          <button
            onClick={() => setShowOverrideForm(!showOverrideForm)}
            className="px-4 py-2 rounded-full bg-soil text-cream text-sm font-medium hover:bg-soil/90 transition-colors"
          >
            + Add override
          </button>
        </div>

        {overrides.length === 0 && !showOverrideForm && (
          <p className="text-sm text-soil/40">No upcoming overrides.</p>
        )}

        <div className="space-y-2">
          {overrides.map((o) => (
            <div key={o.id} className="flex items-center justify-between bg-white rounded-xl border border-linen px-4 py-3">
              <div className="space-y-0.5">
                <span className="font-medium text-sm text-soil">{o.date}</span>
                {o.is_unavailable ? (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500">Unavailable</span>
                ) : (
                  <span className="ml-2 text-xs text-soil/60">
                    {o.start_time?.slice(0, 5)} – {o.end_time?.slice(0, 5)}
                  </span>
                )}
                {o.note && <p className="text-xs text-soil/40">{o.note}</p>}
              </div>
              <button onClick={() => deleteOverride(o.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
            </div>
          ))}
        </div>

        {showOverrideForm && (
          <div className="bg-white rounded-xl border border-moss/20 p-4 space-y-3 max-w-sm">
            <Field label="Date">
              <input type="date" value={newOverride.date ?? ""} onChange={(e) => setNewOverride({ ...newOverride, date: e.target.value })} className={inputCls} />
            </Field>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newOverride.is_unavailable ?? true}
                onChange={(e) => setNewOverride({ ...newOverride, is_unavailable: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-soil">Mark as unavailable (block the day)</span>
            </label>

            {!newOverride.is_unavailable && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start time">
                  <input type="time" value={newOverride.start_time ?? "09:00"} onChange={(e) => setNewOverride({ ...newOverride, start_time: e.target.value })} className={inputCls} />
                </Field>
                <Field label="End time">
                  <input type="time" value={newOverride.end_time ?? "17:00"} onChange={(e) => setNewOverride({ ...newOverride, end_time: e.target.value })} className={inputCls} />
                </Field>
              </div>
            )}

            <Field label="Note (optional)">
              <input type="text" value={newOverride.note ?? ""} onChange={(e) => setNewOverride({ ...newOverride, note: e.target.value })} placeholder="e.g. Farm closed for event" className={inputCls} />
            </Field>

            <div className="flex gap-2">
              <button onClick={addOverride} className="px-4 py-2 rounded-full bg-clay text-white text-sm">Add</button>
              <button onClick={() => setShowOverrideForm(false)} className="px-4 py-2 rounded-full border border-linen text-soil text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Bookings ─────────────────────────────────────────────────────────────

function BookingsTab({ profileId }: { profileId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Booking[]>(`/booking/admin/bookings?profileId=${profileId}`);
      setBookings(data);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this booking and notify the booker?")) return;
    try {
      await apiPatch(`/booking/admin/bookings/${id}/cancel`, {});
      load();
    } catch { alert("Failed to cancel booking"); }
  };

  const now = new Date();
  const filtered = bookings.filter((b) => {
    if (filter === "all") return true;
    const isPast = new Date(b.start_at) < now;
    return filter === "past" ? isPast : !isPast;
  });

  if (loading) return <p className="text-sm text-soil/50">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-soil">Bookings</h2>
        <div className="flex gap-1 bg-linen rounded-full p-0.5 text-xs">
          {(["upcoming", "past", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full capitalize transition-colors ${filter === f ? "bg-white text-soil shadow-sm" : "text-soil/50 hover:text-soil"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-soil/40">No {filter === "all" ? "" : filter} bookings.</p>
      )}

      <div className="space-y-3">
        {filtered.map((b) => {
          const isPast = new Date(b.start_at) < now;
          return (
            <div
              key={b.id}
              className={`bg-white rounded-xl border p-4 ${b.status === "cancelled" ? "opacity-60 border-dashed border-linen" : "border-linen"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-soil text-sm">{b.booker_name}</p>
                    {b.status === "cancelled" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-400">Cancelled</span>
                    )}
                    {b.status === "confirmed" && isPast && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-linen text-soil/50">Completed</span>
                    )}
                    {b.status === "confirmed" && !isPast && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-moss/10 text-moss">Upcoming</span>
                    )}
                  </div>
                  <p className="text-xs text-soil/50">{b.booker_email}</p>
                  <p className="text-xs text-soil/70">
                    {b.session_types?.name ?? "Unknown session"} ·{" "}
                    {formatDateTime(b.start_at, b.timezone)}
                  </p>
                  {b.booker_notes && (
                    <p className="text-xs text-soil/50 italic">&ldquo;{b.booker_notes}&rdquo;</p>
                  )}
                </div>
                {b.status === "confirmed" && !isPast && (
                  <button
                    onClick={() => handleCancel(b.id)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-linen bg-white text-sm text-soil focus:outline-none focus:ring-2 focus:ring-clay/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-soil/60">{label}</label>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = "profile" | "sessions" | "availability" | "bookings";

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<BookableProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("profile");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth"}/booking/admin/profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: BookableProfile[]) => {
        if (data.length > 0) setProfile(data[0] ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "sessions", label: "Session Types" },
    { key: "availability", label: "Availability" },
    { key: "bookings", label: "Bookings" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-soil">Booking Profile</h1>
        {profile && (
          <a
            href={`${process.env.NEXT_PUBLIC_APP_URL ?? "https://hammock.earth"}/profile/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-clay hover:underline"
          >
            View public page →
          </a>
        )}
      </div>

      {loading && <p className="text-sm text-soil/50">Loading…</p>}

      {!loading && (
        <>
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-linen mb-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t.key
                    ? "border-moss text-moss"
                    : "border-transparent text-soil/50 hover:text-soil"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === "profile" && (
            <ProfileTab
              profile={profile}
              onChange={(p) => setProfile(p)}
            />
          )}

          {tab === "sessions" && !profile && (
            <p className="text-sm text-soil/50">Save a profile first to manage session types.</p>
          )}
          {tab === "sessions" && profile && (
            <SessionTypesTab profileId={profile.id} />
          )}

          {tab === "availability" && !profile && (
            <p className="text-sm text-soil/50">Save a profile first to set availability.</p>
          )}
          {tab === "availability" && profile && (
            <AvailabilityTab profileId={profile.id} />
          )}

          {tab === "bookings" && !profile && (
            <p className="text-sm text-soil/50">Save a profile first to view bookings.</p>
          )}
          {tab === "bookings" && profile && (
            <BookingsTab profileId={profile.id} />
          )}
        </>
      )}
    </div>
  );
}
