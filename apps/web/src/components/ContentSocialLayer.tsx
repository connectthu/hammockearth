"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hammock.earth";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

interface ContentSocialLayerProps {
  contentId: string;
  slug: string;
  heartCount: number;
  hearted: boolean;
  isMember: boolean;
  isLoggedIn: boolean;
  locked: boolean;
}

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function ContentSocialLayer({
  contentId,
  slug,
  heartCount: initialHeartCount,
  hearted: initialHearted,
  isMember,
  isLoggedIn,
  locked,
}: ContentSocialLayerProps) {
  const [heartCount, setHeartCount] = useState(initialHeartCount);
  const [hearted, setHearted] = useState(initialHearted);
  const [heartLoading, setHeartLoading] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [copied, setCopied] = useState(false);

  // Load comments when member views unlocked content
  useEffect(() => {
    if (!isMember || locked) return;
    getToken().then((token) => {
      if (!token) return;
      fetch(`${API_URL}/content/${contentId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setComments(data);
          setCommentsLoaded(true);
        })
        .catch(() => setCommentsLoaded(true));
    });
  }, [contentId, isMember, locked]);

  async function handleHeart() {
    if (!isMember || heartLoading) return;
    setHeartLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/content/${contentId}/heart`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHearted(data.hearted);
        setHeartCount(data.heartCount);
      }
    } finally {
      setHeartLoading(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setCommentError("");
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/content/${contentId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: newComment.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCommentError(data.message ?? "Failed to post comment");
        return;
      }
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch {
      setCommentError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm("Delete this comment?")) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/content/${contentId}/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch {}
  }

  function handleShare() {
    const url = `${window.location.origin}/library/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-12 pt-10 border-t border-linen">
      {/* Action bar */}
      <div className="flex items-center gap-4 mb-10">
        {/* Heart */}
        <div className="flex items-center gap-2">
          {isMember ? (
            <button
              onClick={handleHeart}
              disabled={heartLoading}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                hearted ? "text-clay" : "text-soil/40 hover:text-clay"
              }`}
            >
              <span className="text-lg">{hearted ? "♥" : "♡"}</span>
              <span>{heartCount}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-soil/30">
              <span className="text-lg">♡</span>
              <span>{heartCount}</span>
            </span>
          )}
          {!isMember && !locked && (
            <span className="text-xs text-soil/30 ml-1">
              {isLoggedIn ? "Members can heart" : "Sign in to heart"}
            </span>
          )}
        </div>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-soil/40 hover:text-soil transition-colors"
        >
          <span>🔗</span>
          <span>{copied ? "Link copied!" : "Share"}</span>
        </button>
      </div>

      {/* Comments section — members only on unlocked content */}
      {!locked && (
        <div>
          <h2 className="font-serif text-xl text-soil mb-6">
            Community Notes
          </h2>

          {!isMember ? (
            <div className="bg-linen/50 rounded-xl p-6 text-center">
              <p className="text-sm text-soil/60">
                {isLoggedIn
                  ? "Members can leave notes and join the discussion."
                  : "Sign in as a member to join the discussion."}
              </p>
              {!isLoggedIn && (
                <a
                  href="/members/login"
                  className="inline-block mt-3 text-sm text-clay hover:underline"
                >
                  Sign in →
                </a>
              )}
            </div>
          ) : (
            <>
              {/* Comment list */}
              {commentsLoaded && comments.length === 0 && (
                <p className="text-sm text-soil/40 mb-6">
                  No notes yet — be the first to share a thought.
                </p>
              )}
              <div className="space-y-6 mb-8">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-clay/20 flex items-center justify-center overflow-hidden">
                      {c.profiles?.avatar_url ? (
                        <img
                          src={c.profiles.avatar_url}
                          alt={c.profiles.full_name ?? ""}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-clay">
                          {(c.profiles?.full_name ?? "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-medium text-soil">
                          {c.profiles?.full_name ?? "Member"}
                        </span>
                        <span className="text-xs text-soil/30">
                          {new Date(c.created_at).toLocaleDateString("en-CA", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-soil/80 leading-relaxed">{c.body}</p>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-xs text-soil/20 hover:text-red-400 mt-1 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* New comment form */}
              <form onSubmit={handleComment} className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share a note or reflection…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-linen resize-none focus:outline-none focus:ring-2 focus:ring-clay/30 text-sm"
                />
                {commentError && (
                  <p className="text-sm text-red-600">{commentError}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="bg-clay text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-clay/90 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Posting…" : "Post note"}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
