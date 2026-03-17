const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

export function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("admin_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...getAuthHeader() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
}

// ── Collaborator helpers ──────────────────────────────────────────────────────

export interface CollaboratorProfile {
  id:         string;
  full_name:  string | null;
  avatar_url: string | null;
  bio:        string | null;
  public_url: string | null;
}

export function apiGetCollaboratorAccounts() {
  return apiGet<CollaboratorProfile[]>("/events/collaborator-accounts");
}

export function apiGetEventCollaborators(slug: string) {
  return apiGet<CollaboratorProfile[]>(`/events/${slug}/collaborators`);
}

export function apiAddEventCollaborator(slug: string, userId: string) {
  return apiPost<{ success: boolean }>(`/events/${slug}/collaborators`, { userId });
}

export function apiCreateOrPromoteCollaborator(
  email: string,
  name?: string,
  linkToEventSlug?: string,
) {
  return apiPost<CollaboratorProfile>("/events/collaborator-accounts", {
    email,
    name,
    linkToEventSlug,
  });
}

export async function apiRemoveEventCollaborator(slug: string, userId: string) {
  const res = await fetch(`${API_URL}/events/${slug}/collaborators/${userId}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
}
