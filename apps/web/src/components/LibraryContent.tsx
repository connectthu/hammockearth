"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

const CONTENT_TYPES = [
  { key: "", label: "All" },
  { key: "blog_post", label: "Blog Posts" },
  { key: "meditation", label: "Meditations" },
  { key: "video", label: "Videos" },
  { key: "recipe", label: "Recipes" },
  { key: "reflection", label: "Reflections" },
  { key: "guide", label: "Guides" },
  { key: "audio", label: "Audio" },
  { key: "link", label: "Links" },
];

const TOPICS = [
  { key: "nervous_system", label: "Nervous System" },
  { key: "homesteading", label: "Homesteading" },
  { key: "nature_immersion", label: "Nature Immersion" },
  { key: "community_building", label: "Community Building" },
  { key: "wellness", label: "Wellness" },
  { key: "cooking", label: "Cooking" },
  { key: "permaculture", label: "Permaculture" },
  { key: "creative_expression", label: "Creative Expression" },
];

const TYPE_LABELS: Record<string, string> = {
  blog_post: "Blog Post",
  meditation: "Meditation",
  video: "Video",
  recipe: "Recipe",
  reflection: "Reflection",
  guide: "Guide",
  audio: "Audio",
  link: "Link",
};

interface ContentItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  cover_image_url: string | null;
  content_type: string;
  media_kind: string | null;
  external_url: string | null;
  topics: string[];
  visible_to: string[];
  is_featured: boolean;
  heart_count: number;
  read_time_minutes: number | null;
  watch_listen_minutes: number | null;
  published_at: string;
  locked: boolean;
}

const MEDIA_ICONS: Record<string, string> = {
  video: "🎬",
  audio: "🎵",
  pdf: "📄",
  link: "🔗",
};

function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function previewImage(item: ContentItem, ogImages: Record<string, string>): string | null {
  if (item.cover_image_url) return item.cover_image_url;
  if (item.external_url) {
    const yt = getYoutubeThumbnail(item.external_url);
    if (yt) return yt;
    return ogImages[item.external_url] ?? null;
  }
  return null;
}

function placeholderIcon(item: ContentItem): string {
  if (item.external_url && !getYoutubeThumbnail(item.external_url)) return "🔗";
  return MEDIA_ICONS[item.media_kind ?? ""] ?? "🌿";
}

interface LibraryContentProps {
  items: ContentItem[];
  featured: ContentItem | null;
  userLevel: string;
}

function timeLabel(item: ContentItem): string | null {
  if (item.read_time_minutes) return `${item.read_time_minutes} min read`;
  if (item.watch_listen_minutes) return `${item.watch_listen_minutes} min`;
  return null;
}

function LockBadge({ visibleTo, userLevel }: { visibleTo: string[]; userLevel: string }) {
  if (visibleTo.includes("member")) {
    return (
      <span className="text-xs bg-clay/10 text-clay px-2 py-0.5 rounded-full">
        Members only
      </span>
    );
  }
  if (visibleTo.includes("registered")) {
    return (
      <span className="text-xs bg-moss/10 text-moss px-2 py-0.5 rounded-full">
        Sign in to read
      </span>
    );
  }
  return null;
}

function ContentCard({ item, userLevel, ogImages }: { item: ContentItem; userLevel: string; ogImages: Record<string, string> }) {
  const time = timeLabel(item);
  const preview = previewImage(item, ogImages);

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-linen hover:shadow-md transition-shadow flex flex-col">
      {/* Cover image — goes to external URL if present, else slug */}
      <a
        href={item.external_url ?? `/library/${item.slug}`}
        target={item.external_url ? "_blank" : undefined}
        rel={item.external_url ? "noopener noreferrer" : undefined}
        className="block aspect-[16/9] bg-linen overflow-hidden"
      >
        {preview ? (
          <img
            src={preview}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-linen to-cream flex items-center justify-center">
            <span className="text-2xl opacity-30">{placeholderIcon(item)}</span>
          </div>
        )}
      </a>

      {/* Text area — always goes to detail page */}
      <Link href={`/library/${item.slug}`} className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-medium text-clay bg-clay/10 px-2 py-0.5 rounded-full">
            {TYPE_LABELS[item.content_type] ?? item.content_type}
          </span>
          {item.topics[0] && (
            <span className="text-xs text-moss bg-moss/10 px-2 py-0.5 rounded-full">
              {TOPICS.find((t) => t.key === item.topics[0])?.label ?? item.topics[0]}
            </span>
          )}
          {item.locked && <LockBadge visibleTo={item.visible_to} userLevel={userLevel} />}
        </div>

        <h3 className="font-serif text-lg text-soil leading-snug mb-2 group-hover:text-clay transition-colors">
          {item.title}
        </h3>

        {item.summary && (
          <p className="text-sm text-soil/60 line-clamp-2 mb-4 flex-1">{item.summary}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-linen">
          <div className="flex items-center gap-3 text-xs text-soil/40">
            {time && <span>{time}</span>}
            {item.heart_count > 0 && (
              <span className="flex items-center gap-1">
                <span>♡</span>
                {item.heart_count}
              </span>
            )}
          </div>
          <span className="text-xs text-clay group-hover:translate-x-0.5 transition-transform">
            →
          </span>
        </div>
      </Link>
    </div>
  );
}

function FeaturedHero({ item, ogImages }: { item: ContentItem; ogImages: Record<string, string> }) {
  const time = timeLabel(item);
  const preview = previewImage(item, ogImages);
  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-linen hover:shadow-lg transition-shadow mb-12">
      <div className="grid md:grid-cols-5">
        {/* Image — links externally if present, else slug */}
        <a
          href={item.external_url ?? `/library/${item.slug}`}
          target={item.external_url ? "_blank" : undefined}
          rel={item.external_url ? "noopener noreferrer" : undefined}
          className="md:col-span-3 block aspect-[16/10] md:aspect-auto overflow-hidden bg-linen"
        >
          {preview ? (
            <img
              src={preview}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-linen to-cream min-h-64 flex items-center justify-center">
              <span className="text-4xl opacity-20">{placeholderIcon(item)}</span>
            </div>
          )}
        </a>
        {/* Content — always goes to detail page */}
        <Link href={`/library/${item.slug}`} className="md:col-span-2 p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-medium bg-clay text-white px-2.5 py-1 rounded-full">
              Featured
            </span>
            <span className="text-xs font-medium text-clay bg-clay/10 px-2.5 py-1 rounded-full">
              {TYPE_LABELS[item.content_type] ?? item.content_type}
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-soil leading-snug mb-3 group-hover:text-clay transition-colors">
            {item.title}
          </h2>
          {item.summary && (
            <p className="text-soil/60 leading-relaxed mb-6 line-clamp-3">{item.summary}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-soil/40">
              {time && <span>{time}</span>}
              {item.heart_count > 0 && (
                <span className="flex items-center gap-1">♡ {item.heart_count}</span>
              )}
            </div>
            <span className="text-clay font-medium text-sm group-hover:translate-x-0.5 transition-transform">
              Read →
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

export function LibraryContent({ items, featured, userLevel }: LibraryContentProps) {
  const [activeType, setActiveType] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [ogImages, setOgImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const urlsToFetch = items
      .filter((i) => i.external_url && !i.cover_image_url && !getYoutubeThumbnail(i.external_url))
      .map((i) => i.external_url!);
    if (urlsToFetch.length === 0) return;

    Promise.all(
      urlsToFetch.map(async (url) => {
        try {
          const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
          const json = await res.json();
          const image: string | undefined = json?.data?.image?.url;
          if (image) return [url, image] as const;
        } catch {}
        return null;
      })
    ).then((results) => {
      const map: Record<string, string> = {};
      for (const r of results) {
        if (r) map[r[0]] = r[1];
      }
      if (Object.keys(map).length > 0) setOgImages(map);
    });
  }, [items]);

  const filtered = items.filter((item) => {
    if (activeType && item.content_type !== activeType) return false;
    if (activeTopic && !item.topics.includes(activeTopic)) return false;
    return true;
  });

  // Exclude featured from grid if showing in hero
  const gridItems = filtered.filter(
    (i) => !i.is_featured || activeType || activeTopic
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      {/* Featured hero */}
      {featured && !activeType && !activeTopic && <FeaturedHero item={featured} ogImages={ogImages} />}

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-4 mb-10 flex-wrap">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {CONTENT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm transition-colors ${
                activeType === t.key
                  ? "bg-soil text-cream"
                  : "bg-white border border-linen text-soil/60 hover:text-soil hover:border-soil/30"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-charcoal/40 whitespace-nowrap">Filter by topic</label>
          <select
            value={activeTopic}
            onChange={(e) => setActiveTopic(e.target.value)}
            className="text-sm border border-linen rounded-full px-3 py-1.5 bg-white text-charcoal/70 focus:outline-none focus:border-soil cursor-pointer"
          >
            <option value="">All topics</option>
            {TOPICS.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {gridItems.length === 0 ? (
        <p className="text-center text-soil/40 py-16">No items match your filters.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridItems.map((item) => (
            <ContentCard key={item.id} item={item} userLevel={userLevel} ogImages={ogImages} />
          ))}
        </div>
      )}

      {/* Submit a Resource */}
      <SubmitResourceSection userLevel={userLevel} />
    </div>
  );
}

function SubmitResourceSection({ userLevel }: { userLevel: string }) {
  const isLoggedIn = userLevel !== "guest";
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !summary.trim()) return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");

      const res = await fetch(`${API}/content/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ external_url: url.trim(), summary: summary.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(Array.isArray(body.message) ? body.message[0] : (body.message ?? `${res.status}`));
      }
      setStatus("success");
      setUrl("");
      setSummary("");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="mt-20 bg-white rounded-2xl border border-linen p-10">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="font-serif text-2xl text-soil mb-3">Share a resource</h2>
        <p className="text-soil/60 mb-8">
          Found something that belongs here? Submit a link and a short note — our team will review it for the library.
        </p>
      </div>

      {!isLoggedIn ? (
        <div className="max-w-sm mx-auto text-center">
          <Link
            href="/members/login?next=/library"
            className="inline-block bg-clay text-white font-medium px-6 py-3 rounded-full hover:bg-clay/90 transition-colors text-sm"
          >
            Sign in to submit a resource
          </Link>
        </div>
      ) : status === "success" ? (
        <div className="max-w-sm mx-auto text-center">
          <div className="text-3xl mb-3">🌿</div>
          <p className="text-soil font-medium mb-1">Thank you!</p>
          <p className="text-soil/60 text-sm mb-4">Your submission is in for review.</p>
          <button
            onClick={() => setStatus("idle")}
            className="text-sm text-clay hover:underline"
          >
            Submit another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
          <div>
            <label className="text-xs font-medium text-soil/50 uppercase tracking-widest block mb-1.5">
              Link URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              required
              className="w-full px-4 py-3 rounded-xl border border-linen bg-cream/50 text-sm text-soil placeholder-soil/30 outline-none focus:ring-2 focus:ring-clay/20 focus:border-clay/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-soil/50 uppercase tracking-widest block mb-1.5">
              Why does this belong here?
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, 300))}
              placeholder="A short description of what this is and why it's worth sharing..."
              rows={3}
              required
              className="w-full px-4 py-3 rounded-xl border border-linen bg-cream/50 text-sm text-soil placeholder-soil/30 outline-none focus:ring-2 focus:ring-clay/20 focus:border-clay/30 resize-none"
            />
            <p className={`text-xs mt-1 text-right ${summary.length > 280 ? "text-clay" : "text-soil/30"}`}>
              {300 - summary.length}
            </p>
          </div>
          {status === "error" && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}
          <div className="text-center pt-2">
            <button
              type="submit"
              disabled={status === "submitting" || !url.trim() || !summary.trim()}
              className="bg-clay text-white font-medium px-8 py-3 rounded-full hover:bg-clay/90 transition-colors disabled:opacity-50 text-sm"
            >
              {status === "submitting" ? "Submitting…" : "Submit Resource"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
