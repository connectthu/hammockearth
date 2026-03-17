"use client";

import { useEffect, useState } from "react";
import {
  apiGetCollaboratorAccounts,
  apiGetEventCollaborators,
  apiAddEventCollaborator,
  apiRemoveEventCollaborator,
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
      {all.length === 0 ? (
        <p className="text-xs text-charcoal/40">
          No collaborator accounts exist yet. Set a user's role to 'collaborator' in the database to add them here.
        </p>
      ) : unlinked.length === 0 ? (
        <p className="text-xs text-charcoal/40">All collaborators are already linked to this event.</p>
      ) : (
        <div className="flex gap-2 pt-1">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-linen bg-white text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
          >
            <option value="">Select a collaborator…</option>
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
    </div>
  );
}
