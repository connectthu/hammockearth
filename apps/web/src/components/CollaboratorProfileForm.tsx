"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProfileFields {
  full_name:  string;
  avatar_url: string;
  bio:        string;
  public_url: string;
}

interface CollaboratorProfileFormProps {
  initialProfile: ProfileFields;
}

export function CollaboratorProfileForm({ initialProfile }: CollaboratorProfileFormProps) {
  const [fields, setFields] = useState<ProfileFields>(initialProfile);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name:  fields.full_name  || null,
        avatar_url: fields.avatar_url || null,
        bio:        fields.bio        || null,
        public_url: fields.public_url || null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
    }
    setSaving(false);
  };

  const inputClass =
    "w-full border border-linen rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay/30 bg-white";
  const labelClass =
    "block text-xs font-medium text-moss uppercase tracking-wide mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="full_name">Name</label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          value={fields.full_name}
          onChange={handleChange}
          placeholder="Your full name"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="avatar_url">Avatar URL</label>
        <input
          id="avatar_url"
          name="avatar_url"
          type="url"
          value={fields.avatar_url}
          onChange={handleChange}
          placeholder="https://…"
          className={inputClass}
        />
        {fields.avatar_url && (
          <img
            src={fields.avatar_url}
            alt="Avatar preview"
            className="mt-2 w-12 h-12 rounded-full object-cover border border-linen"
          />
        )}
      </div>

      <div>
        <label className={labelClass} htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          name="bio"
          value={fields.bio}
          onChange={handleChange}
          placeholder="A short intro that will appear on event pages…"
          rows={4}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="public_url">Website / Link</label>
        <input
          id="public_url"
          name="public_url"
          type="url"
          value={fields.public_url}
          onChange={handleChange}
          placeholder="https://yourwebsite.com"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {saved && (
        <p className="text-sm text-moss bg-moss/10 rounded-lg px-3 py-2">
          Profile saved.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-clay text-white font-medium py-3 px-6 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}
