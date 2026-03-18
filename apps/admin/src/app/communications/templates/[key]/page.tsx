"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { RichTextEditor } from "@/components/RichTextEditor";
import { apiGet } from "@/lib/api";
import { getAuthHeader } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

interface EmailTemplate {
  key: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  variables: string[];
  updated_at: string;
}

type EditorMode = "rich" | "html";

export default function TemplateEditorPage() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();

  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>("rich");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    apiGet<EmailTemplate>(`/communications/templates/${key}`)
      .then((tmpl) => {
        setTemplate(tmpl);
        setSubject(tmpl.subject);
        setBodyHtml(tmpl.body_html);
      })
      .catch((err) => setBanner({ type: "error", message: err.message }))
      .finally(() => setLoading(false));
  }, [key]);

  async function handleSave() {
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(`${API_URL}/communications/templates/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ subject, body_html: bodyHtml }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      setBanner({ type: "success", message: "Template saved." });
    } catch (err: any) {
      setBanner({ type: "error", message: err.message ?? "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  function handlePreview() {
    const wrapped = `<html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;max-width:600px;margin:40px auto;color:#3B2F2F;padding:0 16px}</style></head><body>${bodyHtml}</body></html>`;
    const url = URL.createObjectURL(new Blob([wrapped], { type: "text/html" }));
    window.open(url, "_blank");
  }

  return (
    <AdminShell>
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/communications" className="text-sm text-clay hover:underline">
            ← Communications
          </Link>
        </div>

        {loading && <p className="text-sm text-soil/50">Loading…</p>}

        {!loading && template && (
          <>
            <div>
              <h1 className="font-serif text-2xl text-soil">{template.name}</h1>
              {template.description && (
                <p className="text-sm text-soil/50 mt-1">{template.description}</p>
              )}
            </div>

            {/* Banner */}
            {banner && (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  banner.type === "success"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {banner.message}
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-soil mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30"
              />
            </div>

            {/* Variable reference */}
            {template.variables.length > 0 && (
              <div>
                <p className="text-xs text-soil/50 mb-2">Available variables</p>
                <div className="flex flex-wrap gap-2">
                  {template.variables.map((v) => (
                    <span
                      key={v}
                      className="text-xs px-2 py-1 rounded-full bg-moss/10 text-moss font-mono"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Editor mode tabs */}
            <div>
              <div className="flex gap-1 mb-3 border-b border-linen">
                {(["rich", "html"] as EditorMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setEditorMode(mode)}
                    className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
                      editorMode === mode
                        ? "bg-white border border-b-white border-linen text-soil font-medium -mb-px"
                        : "text-soil/50 hover:text-soil"
                    }`}
                  >
                    {mode === "rich" ? "Rich Text" : "HTML"}
                  </button>
                ))}
              </div>

              {editorMode === "rich" ? (
                <div className="rounded-xl border border-linen overflow-hidden">
                  <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
                </div>
              ) : (
                <textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  className="w-full h-96 px-4 py-3 rounded-xl border border-linen text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-clay/30"
                  spellCheck={false}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-clay text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-clay/90 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={handlePreview}
                className="text-sm text-clay border border-clay/30 px-5 py-2.5 rounded-full hover:bg-clay/5 transition-colors"
              >
                Preview
              </button>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
