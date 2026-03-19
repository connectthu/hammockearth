"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
    <Link
      href={`/library/${item.slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-linen hover:shadow-md transition-shadow flex flex-col"
    >
      {/* Cover image */}
      <div className="aspect-[16/9] bg-linen overflow-hidden">
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
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* Type + topic badge */}
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
      </div>
    </Link>
  );
}

function FeaturedHero({ item, ogImages }: { item: ContentItem; ogImages: Record<string, string> }) {
  const time = timeLabel(item);
  const preview = previewImage(item, ogImages);
  return (
    <Link
      href={`/library/${item.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-linen hover:shadow-lg transition-shadow mb-12"
    >
      <div className="grid md:grid-cols-5">
        {/* Image — left 3 cols */}
        <div className="md:col-span-3 aspect-[16/10] md:aspect-auto overflow-hidden bg-linen">
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
        </div>
        {/* Content — right 2 cols */}
        <div className="md:col-span-2 p-8 flex flex-col justify-center">
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
        </div>
      </div>
    </Link>
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

      {/* Content type filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-none">
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

      {/* Topic pills */}
      <div className="flex flex-wrap gap-2 mb-10">
        <span className="text-xs text-soil/40 self-center mr-1">Explore topics:</span>
        {TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTopic(activeTopic === t.key ? "" : t.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activeTopic === t.key
                ? "bg-moss text-white border-moss"
                : "bg-white border-linen text-soil/60 hover:border-moss/40 hover:text-moss"
            }`}
          >
            {t.label}
          </button>
        ))}
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

      {/* CTA */}
      <div className="mt-20 bg-white rounded-2xl border border-linen p-10 text-center">
        <h2 className="font-serif text-2xl text-soil mb-3">Seeking something specific?</h2>
        <p className="text-soil/60 max-w-xl mx-auto mb-6">
          If you can't find what you're looking for, reach out to the Community Stewards.
          We are constantly expanding our library with member-requested topics.
        </p>
        <a
          href="mailto:hello@hammock.earth"
          className="inline-block bg-clay text-white font-medium px-6 py-3 rounded-full hover:bg-clay/90 transition-colors"
        >
          Request a Resource
        </a>
      </div>
    </div>
  );
}
