"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { apiGet, apiDelete } from "@/lib/api";

interface ContentItem {
  id: string;
  slug: string;
  title: string;
  content_type: string;
  topics: string[];
  visible_to: string[];
  is_featured: boolean;
  heart_count: number;
  published_at: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  blog_post: "Blog Post",
  meditation: "Meditation",
  video: "Video",
  recipe: "Recipe",
  reflection: "Reflection",
  guide: "Guide",
  audio: "Audio",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ContentListPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<ContentItem[]>("/content/admin/list")
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/content/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      alert(err.message ?? "Delete failed");
    }
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-soil">Content Library</h1>
            <p className="text-sm text-soil/50 mt-0.5">The Living Room — manage all content items</p>
          </div>
          <Link
            href="/content/new"
            className="bg-clay text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-clay/90 transition-colors"
          >
            + New Item
          </Link>
        </div>

        {loading && <p className="text-sm text-soil/50">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && (
          <div className="bg-white rounded-2xl border border-linen overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-linen text-left">
                  <th className="px-5 py-3 font-medium text-soil/60">Title</th>
                  <th className="px-5 py-3 font-medium text-soil/60">Type</th>
                  <th className="px-5 py-3 font-medium text-soil/60">Visibility</th>
                  <th className="px-5 py-3 font-medium text-soil/60">Status</th>
                  <th className="px-5 py-3 font-medium text-soil/60">♡</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-soil/40">
                      No content yet.{" "}
                      <Link href="/content/new" className="text-clay hover:underline">
                        Create the first item →
                      </Link>
                    </td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-linen last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-soil">{item.title}</span>
                        {item.is_featured && (
                          <span className="text-xs bg-clay/10 text-clay px-1.5 py-0.5 rounded-full">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-soil/40 mt-0.5 font-mono">{item.slug}</div>
                    </td>
                    <td className="px-5 py-4 text-soil/60">
                      {TYPE_LABELS[item.content_type] ?? item.content_type}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(item.visible_to ?? []).map((v) => (
                          <span key={v} className="text-xs bg-linen text-soil/60 px-1.5 py-0.5 rounded">
                            {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {item.published_at ? (
                        <span className="text-xs text-moss">
                          Published {formatDate(item.published_at)}
                        </span>
                      ) : (
                        <span className="text-xs text-soil/30">Draft</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-soil/40">{item.heart_count}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center gap-3 justify-end">
                        <Link
                          href={`/content/${item.id}/edit`}
                          className="text-clay text-sm hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="text-sm text-soil/30 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
