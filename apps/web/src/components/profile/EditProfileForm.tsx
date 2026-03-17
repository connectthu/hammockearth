"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AvatarUpload } from "./AvatarUpload";
import { SuperpowerPicker } from "./SuperpowerPicker";
import { OfferingsEditor } from "./OfferingsEditor";

interface Superpower {
  id: string;
  label: string;
}

interface Offering {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  display_order: number;
}

interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  username: string | null;
  location: string | null;
  social_links: Record<string, string>;
  profile_visibility: "public" | "members_only";
}

interface EditProfileFormProps {
  profile: ProfileData;
  allSuperpowers: Superpower[];
  selectedSuperpowers: Superpower[];
  offerings: Offering[];
}

export function EditProfileForm({
  profile,
  allSuperpowers,
  selectedSuperpowers: initialSelected,
  offerings: initialOfferings,
}: EditProfileFormProps) {
  const supabase = createClient();

  const [fields, setFields] = useState({
    full_name: profile.full_name ?? "",
    username: profile.username ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    social_links: {
      instagram: profile.social_links?.instagram ?? "",
      website: profile.social_links?.website ?? "",
      substack: profile.social_links?.substack ?? "",
      other: profile.social_links?.other ?? "",
    },
    profile_visibility: profile.profile_visibility,
    avatar_url: profile.avatar_url ?? "",
  });

  const [selectedSuperpowers, setSelectedSuperpowers] = useState<Superpower[]>(initialSelected);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, value: any) => {
    setFields((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // Update profile scalar fields
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fields.full_name || null,
          username: fields.username || null,
          bio: fields.bio || null,
          location: fields.location || null,
          avatar_url: fields.avatar_url || null,
          social_links: Object.fromEntries(
            Object.entries(fields.social_links).filter(([, v]) => v.trim() !== "")
          ),
          profile_visibility: fields.profile_visibility,
        } as any)
        .eq("id", profile.id);

      if (profileError) throw profileError;

      // Superpowers: delete-all + re-insert
      await supabase
        .from("profile_superpowers")
        .delete()
        .eq("profile_id", profile.id);

      if (selectedSuperpowers.length > 0) {
        await supabase
          .from("profile_superpowers")
          .insert(
            selectedSuperpowers.map((s) => ({
              profile_id: profile.id,
              superpower_id: s.id,
            }))
          );
      }

      setSaved(true);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    }
    setSaving(false);
  }

  const inputClass =
    "w-full border border-linen rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30 bg-white";
  const labelClass =
    "block text-xs font-medium text-moss uppercase tracking-wide mb-1.5";

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-8">
        {/* Identity */}
        <section>
          <h2 className="font-serif text-lg text-soil mb-4 pb-2 border-b border-linen">Identity</h2>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <AvatarUpload
              userId={profile.id}
              currentUrl={fields.avatar_url || null}
              onChange={(url) => set("avatar_url", url)}
            />
            <div className="flex-1 space-y-4">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={fields.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="Your full name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40 text-sm">@</span>
                  <input
                    type="text"
                    value={fields.username}
                    onChange={(e) =>
                      set("username", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    placeholder="your-username"
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bio */}
        <section>
          <h2 className="font-serif text-lg text-soil mb-4 pb-2 border-b border-linen">Bio</h2>
          <textarea
            value={fields.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Tell the community about yourself…"
            rows={5}
            className={`${inputClass} resize-none`}
          />
        </section>

        {/* Location */}
        <section>
          <h2 className="font-serif text-lg text-soil mb-4 pb-2 border-b border-linen">Location</h2>
          <input
            type="text"
            value={fields.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. Ontario, Canada"
            className={inputClass}
          />
        </section>

        {/* Social links */}
        <section>
          <h2 className="font-serif text-lg text-soil mb-4 pb-2 border-b border-linen">Social Links</h2>
          <div className="space-y-4">
            {(["instagram", "website", "substack", "other"] as const).map((key) => (
              <div key={key}>
                <label className={labelClass}>{key === "other" ? "Other link" : key.charAt(0).toUpperCase() + key.slice(1)}</label>
                <input
                  type="text"
                  value={fields.social_links[key]}
                  onChange={(e) =>
                    set("social_links", { ...fields.social_links, [key]: e.target.value })
                  }
                  placeholder={
                    key === "instagram" ? "@yourhandle" :
                    key === "website" ? "https://yoursite.com" :
                    key === "substack" ? "yourname.substack.com" :
                    "https://…"
                  }
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Superpowers */}
        <section>
          <h2 className="font-serif text-lg text-soil mb-4 pb-2 border-b border-linen">Superpowers</h2>
          <SuperpowerPicker
            userId={profile.id}
            all={allSuperpowers}
            selected={selectedSuperpowers}
            onChange={setSelectedSuperpowers}
          />
        </section>

        {/* Offerings */}
        <section>
          <h2 className="font-serif text-lg text-soil mb-4 pb-2 border-b border-linen">What I Love to Give</h2>
          <p className="text-sm text-charcoal/50 mb-4">Skills, trades, or knowledge you'd offer to the community.</p>
          <OfferingsEditor profileId={profile.id} initial={initialOfferings} />
        </section>

        {/* Visibility */}
        <section>
          <h2 className="font-serif text-lg text-soil mb-4 pb-2 border-b border-linen">Visibility</h2>
          <div className="space-y-3">
            {[
              { value: "members_only" as const, title: "Members only", desc: "Only logged-in members can view your profile." },
              { value: "public" as const, title: "Public", desc: "Anyone with the link can view your profile." },
            ].map(({ value, title, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => set("profile_visibility", value)}
                className={`w-full text-left border rounded-2xl p-4 transition-colors ${
                  fields.profile_visibility === value
                    ? "border-clay bg-clay/5"
                    : "border-linen hover:border-clay/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    fields.profile_visibility === value ? "border-clay" : "border-linen"
                  }`}>
                    {fields.profile_visibility === value && (
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
        </section>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mt-6">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-moss bg-moss/10 rounded-xl px-4 py-3 mt-6">Profile saved.</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="mt-6 w-full bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}
