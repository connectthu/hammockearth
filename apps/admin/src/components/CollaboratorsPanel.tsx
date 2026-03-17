"use client";

import { useEffect, useState } from "react";
import {
  apiGetCollaboratorAccounts,
  apiGetEventCollaborators,
  apiAddEventCollaborator,
  apiRemoveEventCollaborator,
  apiCreateOrPromoteCollaborator,
  type CollaboratorProfile,
} from "@/lib/api";

interface CollaboratorsPanelProps {
  eventSlug: string;
}

export function CollaboratorsPanel({ eventSlug }: CollaboratorsPanelProps) {
  const [linked, setLinked]       = useState<CollaboratorProfile[]>([]);
  const [all, setAll]             = useState<CollaboratorProfile[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [adding, setAdding]       = useState(false);
  const [removing, setRemoving]   = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // Invite form state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName]   = useState("");
  const [inviteLink, setInviteLink]   = useState(true);
  const [inviting, setInviting]       = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [eventSlug]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [linkedData, allData] = await Promise.all([
        apiGetEventCollaborators(eventSlug),
        apiGetCollaboratorAccounts(),
      ]);
      setLinked(linkedData);
      setAll(allData);
    } catch {
      setError("Failed to load collaborators.");
    } finally {
      setLoading(false);
    }
  }

  const unlinked = all.filter((a) => !linked.some((l) => l.id === a.id));

  async function handleAdd() {
    if (!selectedId) return;
    setAdding(true);
    setError(null);
    try {
      await apiAddEventCollaborator(eventSlug, selectedId);
      setSelectedId("");
      await load();
    } catch {
      setError("Failed to add collaborator.");
    } finally {
      setAdding(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setError(null);
    setInviteSuccess(null);
    try {
      const profile = await apiCreateOrPromoteCollaborator(
        inviteEmail,
        inviteName || undefined,
        inviteLink ? eventSlug : undefined,
      );
      setInviteSuccess(
        `${profile.full_name ?? inviteEmail} is now a collaborator${inviteLink ? " and linked to this event" : ""}.`
      );
      setInviteEmail("");
      setInviteName("");
      setShowInvite(false);
      await load();
    } catch {
      setError("Failed to create collaborator. Check the email and try again.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string) {
    setRemoving(userId);
    setError(null);
    try {
      await apiRemoveEventCollaborator(eventSlug, userId);
      await load();
    } catch {
      setError("Failed to remove collaborator.");
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-charcoal/40 py-4">Loading collaborators…</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Current collaborators */}
      {linked.length === 0 ? (
        <p className="text-sm text-charcoal/40">No collaborators linked to this event yet.</p>
      ) : (
        <ul className="space-y-2">
          {linked.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-linen last:border-0">
              <div className="flex items-center gap-3">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={c.full_name ?? ""} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-linen flex items-center justify-center flex-shrink-0 text-xs font-semibold text-charcoal/50">
                    {(c.full_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-soil">{c.full_name ?? "Unnamed"}</p>
                  {c.bio && <p className="text-xs text-charcoal/40 truncate max-w-xs">{c.bio}</p>}
                </div>
              </div>
              <button
                onClick={() => handleRemove(c.id)}
                disabled={removing === c.id}
                className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors flex-shrink-0"
              >
                {removing === c.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add collaborator */}
      {unlinked.length > 0 && (
        <div className="flex gap-2 pt-1">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-linen bg-white text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
          >
            <option value="">Select existing collaborator…</option>
            {unlinked.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name ?? c.id}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedId || adding}
            className="px-4 py-2 rounded-xl bg-clay text-white text-sm font-medium hover:bg-clay/90 disabled:opacity-40 transition-colors"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      )}

      {/* Invite new collaborator */}
      <div className="pt-2 border-t border-linen">
        {inviteSuccess && (
          <p className="text-xs text-moss bg-moss/10 rounded-lg px-3 py-2 mb-3">{inviteSuccess}</p>
        )}

        {!showInvite ? (
          <button
            onClick={() => setShowInvite(true)}
            className="text-xs text-clay hover:underline"
          >
            + Invite new collaborator by email
          </button>
        ) : (
          <form onSubmit={handleInvite} className="space-y-3">
            <p className="text-xs font-medium text-soil">Invite new collaborator</p>
            <input
              type="email"
              required
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-linen bg-white text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-linen bg-white text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
            />
            <label className="flex items-center gap-2 text-xs text-charcoal/70 cursor-pointer">
              <input
                type="checkbox"
                checked={inviteLink}
                onChange={(e) => setInviteLink(e.target.checked)}
                className="rounded"
              />
              Link to this event immediately
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 rounded-xl bg-clay text-white text-sm font-medium hover:bg-clay/90 disabled:opacity-40 transition-colors"
              >
                {inviting ? "Inviting…" : "Invite"}
              </button>
              <button
                type="button"
                onClick={() => { setShowInvite(false); setInviteEmail(""); setInviteName(""); }}
                className="px-4 py-2 rounded-xl border border-linen text-sm text-charcoal/60 hover:border-clay/30 transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-charcoal/40">
              If this email already has an account, it will be promoted to collaborator.
              They can log in at hammock.earth/members/login with a magic link.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
