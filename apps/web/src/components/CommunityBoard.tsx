"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

const ASK_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "gardening", label: "Gardening" },
  { value: "advice", label: "Advice" },
  { value: "carpool", label: "Carpool" },
  { value: "tools", label: "Tools" },
  { value: "veggie_swap", label: "Veggie Swap" },
  { value: "referral", label: "Referral" },
];

const CATEGORY_COLORS: Record<string, string> = {
  gardening: "bg-moss/10 text-moss border-moss/20",
  advice: "bg-clay/10 text-clay border-clay/20",
  carpool: "bg-sky-100 text-sky-700 border-sky-200",
  tools: "bg-amber-100 text-amber-700 border-amber-200",
  veggie_swap: "bg-green-100 text-green-700 border-green-200",
  referral: "bg-purple-100 text-purple-700 border-purple-200",
};

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface Shoutout {
  id: string;
  body: string;
  heart_count: number;
  created_at: string;
  user_id: string;
  profiles: Profile | null;
  hearted: boolean;
}

interface Ask {
  id: string;
  category: string;
  title: string;
  body: string;
  supported_count: number;
  status: "open" | "closed";
  created_at: string;
  user_id: string;
  profiles: Profile | null;
  supported: boolean;
  isOwner: boolean;
}

async function apiFetch(path: string, token: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `${res.status}`);
  }
  return res.json();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function Avatar({ profile }: { profile: Profile | null }) {
  const name = profile?.full_name ?? "?";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-clay/20 text-clay font-medium flex items-center justify-center text-xs flex-shrink-0">
      {initials}
    </div>
  );
}

// ── Shoutout Card ─────────────────────────────────────────────────────────────

function ShoutoutCard({
  item,
  onHeart,
  onDelete,
  currentUserId,
}: {
  item: Shoutout;
  onHeart: (id: string) => void;
  onDelete: (id: string) => void;
  currentUserId: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-linen p-5 break-inside-avoid mb-4">
      <div className="flex items-start gap-3 mb-3">
        <Avatar profile={item.profiles} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-soil leading-snug">
            {item.profiles?.full_name ?? "Member"}
          </p>
          <p className="text-xs text-charcoal/40">{timeAgo(item.created_at)}</p>
        </div>
        {item.user_id === currentUserId && (
          <button
            onClick={() => onDelete(item.id)}
            className="text-charcoal/20 hover:text-red-400 transition-colors p-1 -mr-1 -mt-1 rounded"
            title="Delete shoutout"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-sm text-charcoal/80 leading-relaxed mb-4">{item.body}</p>

      <button
        onClick={() => onHeart(item.id)}
        className={`flex items-center gap-1.5 text-xs transition-colors ${
          item.hearted ? "text-clay" : "text-charcoal/40 hover:text-clay"
        }`}
      >
        <svg
          className="w-4 h-4"
          fill={item.hearted ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <span>{item.heart_count > 0 ? item.heart_count : ""}</span>
      </button>
    </div>
  );
}

// ── Shoutout Compose ──────────────────────────────────────────────────────────

function ShoutoutCompose({ onPost }: { onPost: (body: string) => Promise<void> }) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    setError("");
    try {
      await onPost(body.trim());
      setBody("");
    } catch (err: any) {
      setError(err.message ?? "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  const remaining = 140 - body.length;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-linen p-5 mb-6">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 140))}
        placeholder="Share something with the community..."
        rows={3}
        className="w-full text-sm text-soil placeholder-charcoal/30 bg-transparent resize-none outline-none"
      />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-linen">
        <span className={`text-xs ${remaining < 20 ? "text-clay" : "text-charcoal/30"}`}>
          {remaining} characters
        </span>
        <div className="flex items-center gap-3">
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={posting || !body.trim()}
            className="text-sm font-medium bg-clay text-white px-4 py-1.5 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Ask Card ──────────────────────────────────────────────────────────────────

function AskCard({
  item,
  onSupport,
  onClose,
  onDelete,
  currentUserId,
}: {
  item: Ask;
  onSupport: (id: string) => void;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
  currentUserId: string;
}) {
  const categoryColor = CATEGORY_COLORS[item.category] ?? "bg-linen text-charcoal/60 border-linen";

  return (
    <div className={`bg-white rounded-2xl border p-5 break-inside-avoid mb-4 ${item.status === "closed" ? "opacity-60" : "border-linen"}`}>
      <div className="flex items-start gap-3 mb-3">
        <Avatar profile={item.profiles} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-soil leading-snug">
            {item.profiles?.full_name ?? "Member"}
          </p>
          <p className="text-xs text-charcoal/40">{timeAgo(item.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${categoryColor}`}>
            {item.category.replace("_", " ")}
          </span>
          {item.isOwner && item.status === "open" && (
            <button
              onClick={() => onClose(item.id)}
              className="text-[10px] text-charcoal/30 hover:text-soil border border-charcoal/20 px-2 py-0.5 rounded-full transition-colors"
              title="Mark as resolved"
            >
              Close
            </button>
          )}
          {(item.isOwner || item.user_id === currentUserId) && (
            <button
              onClick={() => onDelete(item.id)}
              className="text-charcoal/20 hover:text-red-400 transition-colors p-1 rounded"
              title="Delete ask"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="text-sm font-medium text-soil mb-1">{item.title}</p>
      <p className="text-sm text-charcoal/70 leading-relaxed mb-4">{item.body}</p>

      <div className="flex items-center justify-between">
        {item.status === "closed" ? (
          <span className="text-xs text-moss font-medium">Resolved ✓</span>
        ) : item.isOwner ? (
          <span className="text-xs text-charcoal/40">
            {item.supported_count > 0
              ? `${item.supported_count} member${item.supported_count !== 1 ? "s" : ""} offered to help`
              : "No offers yet"}
          </span>
        ) : (
          <button
            onClick={() => onSupport(item.id)}
            disabled={item.supported}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              item.supported
                ? "text-moss cursor-default"
                : "text-clay hover:text-clay/80"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            {item.supported ? "You offered to help" : "I can help"}
          </button>
        )}
        {item.supported_count > 0 && !item.isOwner && (
          <span className="text-xs text-charcoal/30">{item.supported_count} helped</span>
        )}
      </div>
    </div>
  );
}

// ── Ask Compose ───────────────────────────────────────────────────────────────

function AskCompose({ onPost }: { onPost: (data: { category: string; title: string; body: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("gardening");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setPosting(true);
    setError("");
    try {
      await onPost({ category, title: title.trim(), body: body.trim() });
      setTitle("");
      setBody("");
      setCategory("gardening");
      setOpen(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white border border-dashed border-clay/30 text-clay/70 hover:text-clay hover:border-clay/50 text-sm rounded-2xl p-4 text-left transition-colors mb-6"
      >
        + Post an Ask...
      </button>
    );
  }

  const remaining = 140 - body.length;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-linen p-5 mb-6 space-y-4">
      <div>
        <label className="text-xs text-charcoal/50 uppercase tracking-widest font-medium block mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {ASK_CATEGORIES.slice(1).map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                category === cat.value
                  ? "bg-clay text-white border-clay"
                  : "border-linen text-charcoal/60 hover:border-clay/40"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you need? (short title)"
          className="w-full text-sm text-soil placeholder-charcoal/30 bg-linen/50 rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-clay/30"
        />
      </div>

      <div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 140))}
          placeholder="A little more detail..."
          rows={3}
          className="w-full text-sm text-soil placeholder-charcoal/30 bg-linen/50 rounded-xl px-4 py-2.5 resize-none outline-none focus:ring-1 focus:ring-clay/30"
        />
        <p className={`text-xs mt-1 ${remaining < 20 ? "text-clay" : "text-charcoal/30"}`}>
          {remaining} characters
        </p>
      </div>

      <div className="flex items-center justify-between">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3 ml-auto">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-charcoal/50 hover:text-soil transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={posting || !title.trim() || !body.trim()}
            className="text-sm font-medium bg-clay text-white px-4 py-1.5 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50"
          >
            {posting ? "Posting…" : "Post Ask"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Be the Change card ─────────────────────────────────────────────────────────

function BeTheChangeCard() {
  return (
    <div className="bg-gradient-to-br from-moss/15 to-clay/10 rounded-2xl border border-moss/20 p-6 break-inside-avoid mb-4">
      <div className="text-2xl mb-3">🌱</div>
      <h3 className="font-serif text-lg text-soil mb-2">Be the Change</h3>
      <p className="text-sm text-charcoal/60 leading-relaxed">
        Every shoutout, every act of help — it ripples. This is how community grows: one small gesture at a time.
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CommunityBoard({ isMember, userId }: { isMember: boolean; userId: string }) {
  const [tab, setTab] = useState<"shoutouts" | "asks">("shoutouts");
  const [shoutouts, setShoutouts] = useState<Shoutout[]>([]);
  const [asks, setAsks] = useState<Ask[]>([]);
  const [askCategory, setAskCategory] = useState("all");
  const [loadingShoutouts, setLoadingShoutouts] = useState(true);
  const [loadingAsks, setLoadingAsks] = useState(true);
  const [error, setError] = useState("");
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      tokenRef.current = session?.access_token ?? null;
    });
  }, []);

  useEffect(() => {
    if (!isMember) return;
    setLoadingShoutouts(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return;
      apiFetch("/community/shoutouts", session.access_token)
        .then(setShoutouts)
        .catch((err) => setError(err.message))
        .finally(() => setLoadingShoutouts(false));
    });
  }, [isMember]);

  useEffect(() => {
    if (!isMember) return;
    setLoadingAsks(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) return;
      const params = askCategory !== "all" ? `?category=${askCategory}` : "";
      apiFetch(`/community/asks${params}`, session.access_token)
        .then(setAsks)
        .catch((err) => setError(err.message))
        .finally(() => setLoadingAsks(false));
    });
  }, [isMember, askCategory]);

  async function getToken(): Promise<string> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return session.access_token;
  }

  async function handlePostShoutout(body: string) {
    const token = await getToken();
    const newItem = await apiFetch("/community/shoutouts", token, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    setShoutouts((prev) => [newItem, ...prev]);
  }

  async function handleHeartShoutout(id: string) {
    const token = await getToken();
    const result = await apiFetch(`/community/shoutouts/${id}/heart`, token, { method: "POST" });
    setShoutouts((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, hearted: result.hearted, heart_count: result.heartCount } : s
      )
    );
  }

  async function handleDeleteShoutout(id: string) {
    if (!confirm("Delete this shoutout?")) return;
    const token = await getToken();
    await apiFetch(`/community/shoutouts/${id}`, token, { method: "DELETE" });
    setShoutouts((prev) => prev.filter((s) => s.id !== id));
  }

  async function handlePostAsk(data: { category: string; title: string; body: string }) {
    const token = await getToken();
    const newItem = await apiFetch("/community/asks", token, {
      method: "POST",
      body: JSON.stringify(data),
    });
    setAsks((prev) => [newItem, ...prev]);
  }

  async function handleSupportAsk(id: string) {
    const token = await getToken();
    const result = await apiFetch(`/community/asks/${id}/support`, token, { method: "POST" });
    setAsks((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, supported: true, supported_count: result.supportedCount }
          : a
      )
    );
  }

  async function handleCloseAsk(id: string) {
    if (!confirm("Mark this ask as resolved?")) return;
    const token = await getToken();
    await apiFetch(`/community/asks/${id}/close`, token, { method: "PATCH" });
    setAsks((prev) => prev.map((a) => (a.id === id ? { ...a, status: "closed" as const } : a)));
  }

  async function handleDeleteAsk(id: string) {
    if (!confirm("Delete this ask?")) return;
    const token = await getToken();
    await apiFetch(`/community/asks/${id}`, token, { method: "DELETE" });
    setAsks((prev) => prev.filter((a) => a.id !== id));
  }

  if (!isMember) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="text-4xl mb-4">🌿</div>
        <h1 className="font-serif text-2xl text-soil mb-3">Community Board</h1>
        <p className="text-charcoal/60 mb-6">
          The Community Board is available to active members. Join to give and receive support from your Hammock Earth community.
        </p>
        <a
          href="/members"
          className="inline-flex items-center gap-2 bg-clay text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-clay/90 transition-colors"
        >
          Explore Membership
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-soil mb-1">Community Board</h1>
        <p className="text-charcoal/50 text-sm">Give and receive with your fellow members</p>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-linen rounded-2xl p-1 mb-8 w-fit">
        <button
          onClick={() => setTab("shoutouts")}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "shoutouts" ? "bg-white text-soil shadow-sm" : "text-charcoal/50 hover:text-soil"
          }`}
        >
          Shoutouts
        </button>
        <button
          onClick={() => setTab("asks")}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "asks" ? "bg-white text-soil shadow-sm" : "text-charcoal/50 hover:text-soil"
          }`}
        >
          Asks
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* ── Shoutouts Tab ──────────────────────────────────────────────── */}
      {tab === "shoutouts" && (
        <div>
          <ShoutoutCompose onPost={handlePostShoutout} />

          {loadingShoutouts ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-linen/60 rounded-2xl h-32 mb-4 animate-pulse break-inside-avoid" />
              ))}
            </div>
          ) : shoutouts.length === 0 ? (
            <div className="text-center py-20 text-charcoal/40">
              <div className="text-4xl mb-3">🌸</div>
              <p>Be the first to share a shoutout!</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
              <BeTheChangeCard />
              {shoutouts.map((s) => (
                <ShoutoutCard
                  key={s.id}
                  item={s}
                  onHeart={handleHeartShoutout}
                  onDelete={handleDeleteShoutout}
                  currentUserId={userId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Asks Tab ───────────────────────────────────────────────────── */}
      {tab === "asks" && (
        <div>
          <AskCompose onPost={handlePostAsk} />

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {ASK_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setAskCategory(cat.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  askCategory === cat.value
                    ? "bg-soil text-white border-soil"
                    : "border-linen text-charcoal/60 hover:border-soil/30 bg-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loadingAsks ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-linen/60 rounded-2xl h-40 mb-4 animate-pulse break-inside-avoid" />
              ))}
            </div>
          ) : asks.length === 0 ? (
            <div className="text-center py-20 text-charcoal/40">
              <div className="text-4xl mb-3">🤝</div>
              <p>No asks yet — post one above!</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
              {asks.map((a) => (
                <AskCard
                  key={a.id}
                  item={a}
                  onSupport={handleSupportAsk}
                  onClose={handleCloseAsk}
                  onDelete={handleDeleteAsk}
                  currentUserId={userId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
