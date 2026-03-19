"use client";

import { useState, useRef } from "react";
import { apiPost } from "@/lib/api";

const VIDEO_TYPES = [
  { value: "main_recording", label: "Main Recording" },
  { value: "meditation", label: "Meditation" },
  { value: "bonus", label: "Bonus" },
  { value: "tutorial", label: "Tutorial" },
  { value: "supplementary", label: "Supplementary" },
] as const;

type VideoType = (typeof VIDEO_TYPES)[number]["value"];

interface Props {
  seriesId: string;
  sessionId: string;
  onSaved: (video: any) => void;
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

export function VideoModal({ seriesId, sessionId, onSaved, onClose }: Props) {
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [title, setTitle] = useState("");
  const [videoType, setVideoType] = useState<VideoType>("main_recording");
  const [facilitator, setFacilitator] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");

  // Upload tab
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Paste tab
  const [pasteUrl, setPasteUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  async function handleUpload() {
    if (!file || !title.trim()) {
      setError("Title and file are required.");
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const { videoId, libraryId, uploadUrl, signature, expiry } =
        await apiPost<any>(`/series/${seriesId}/sessions/${sessionId}/videos/upload-url`, { title });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("AuthorizationSignature", signature);
        xhr.setRequestHeader("AuthorizationExpire", String(expiry));
        xhr.setRequestHeader("VideoId", videoId);
        xhr.setRequestHeader("LibraryId", libraryId);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress((e.loaded / e.total) * 100);
        };
        xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.send(file);
      });

      setSaving(true);
      const video = await apiPost<any>(`/series/${seriesId}/sessions/${sessionId}/videos`, {
        title: title.trim(),
        videoType,
        bunnyVideoId: videoId,
        facilitator: facilitator.trim() || undefined,
        description: description.trim() || undefined,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
        displayOrder: parseInt(displayOrder, 10) || 0,
      });
      onSaved(video);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  async function handlePaste() {
    if (!pasteUrl.trim() || !title.trim()) {
      setError("Title and URL are required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const video = await apiPost<any>(`/series/${seriesId}/sessions/${sessionId}/videos`, {
        title: title.trim(),
        videoType,
        bunnyUrl: pasteUrl.trim(),
        facilitator: facilitator.trim() || undefined,
        description: description.trim() || undefined,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
        displayOrder: parseInt(displayOrder, 10) || 0,
      });
      onSaved(video);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-linen">
          <h2 className="font-serif text-lg text-soil">Add Video</h2>
          <button onClick={onClose} className="text-charcoal/40 hover:text-charcoal text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-linen">
          {(["upload", "paste"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-clay border-b-2 border-clay"
                  : "text-charcoal/50 hover:text-charcoal"
              }`}
            >
              {t === "upload" ? "Upload File" : "Paste URL"}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Shared fields */}
          <div>
            <label className="block text-xs font-medium text-charcoal/60 mb-1">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Session 1 Recording" />
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal/60 mb-1">Type *</label>
            <select value={videoType} onChange={(e) => setVideoType(e.target.value as VideoType)} className={inputCls}>
              {VIDEO_TYPES.map((vt) => (
                <option key={vt.value} value={vt.value}>{vt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-charcoal/60 mb-1">Facilitator</label>
              <input value={facilitator} onChange={(e) => setFacilitator(e.target.value)} className={inputCls} placeholder="Name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-charcoal/60 mb-1">Duration (min)</label>
              <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className={inputCls} placeholder="90" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal/60 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls + " resize-none"} />
          </div>

          <div>
            <label className="block text-xs font-medium text-charcoal/60 mb-1">Display order</label>
            <input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} className={inputCls} />
          </div>

          {/* Tab-specific */}
          {tab === "upload" && (
            <div>
              <label className="block text-xs font-medium text-charcoal/60 mb-1">Video file *</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-charcoal/70 file:mr-3 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-clay/10 file:text-clay hover:file:bg-clay/20"
              />
              {uploading && (
                <div className="mt-3">
                  <div className="h-2 bg-linen rounded-full overflow-hidden">
                    <div
                      className="h-full bg-clay transition-all duration-200 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-charcoal/50 mt-1 text-center">{Math.round(progress)}%</p>
                </div>
              )}
            </div>
          )}

          {tab === "paste" && (
            <div>
              <label className="block text-xs font-medium text-charcoal/60 mb-1">Bunny URL *</label>
              <input
                type="url"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                className={inputCls}
                placeholder="https://iframe.mediadelivery.net/embed/..."
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="text-sm text-charcoal/50 hover:text-charcoal px-4 py-2">
              Cancel
            </button>
            <button
              onClick={tab === "upload" ? handleUpload : handlePaste}
              disabled={uploading || saving}
              className="bg-clay text-white text-sm font-medium px-6 py-2 rounded-full hover:bg-clay/90 disabled:opacity-50 transition-colors"
            >
              {uploading ? "Uploading..." : saving ? "Saving..." : "Save video"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
