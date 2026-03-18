"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { ContentForm } from "@/components/ContentForm";
import { apiGet } from "@/lib/api";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  cover_image_url: string | null;
  content_type: string;
  media_url: string | null;
  media_kind: string | null;
  topics: string[];
  visible_to: string[];
  is_featured: boolean;
  read_time_minutes: number | null;
  watch_listen_minutes: number | null;
  published_at: string | null;
}

export default function EditContentPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<ContentItem>(`/content/admin/${id}`)
      .then(setItem)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/content" className="text-sm text-clay hover:underline">
            ← Content Library
          </Link>
        </div>

        {loading && <p className="text-sm text-soil/50">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && item && (
          <>
            <div>
              <h1 className="font-serif text-2xl text-soil">Edit: {item.title}</h1>
            </div>
            <ContentForm
              mode="edit"
              initialValues={{
                id: item.id,
                title: item.title,
                slug: item.slug,
                summary: item.summary ?? "",
                body: item.body ?? "",
                cover_image_url: item.cover_image_url ?? "",
                content_type: item.content_type,
                media_url: item.media_url ?? "",
                media_kind: item.media_kind ?? "",
                topics: item.topics ?? [],
                visible_to: item.visible_to ?? ["public"],
                is_featured: item.is_featured ?? false,
                read_time_minutes: item.read_time_minutes?.toString() ?? "",
                watch_listen_minutes: item.watch_listen_minutes?.toString() ?? "",
                published_at: item.published_at ?? "",
              }}
            />
          </>
        )}
      </div>
    </AdminShell>
  );
}
