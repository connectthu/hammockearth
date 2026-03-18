"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { apiGet, apiPatch } from "@/lib/api";

interface EmailTemplate {
  key: string;
  name: string;
  description: string | null;
  subject: string;
  variables: string[];
  updated_at: string;
}

interface NotificationSetting {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  recipient_emails: string[];
  updated_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CommunicationsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [notifications, setNotifications] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Per-notification email edit state: key → draft string
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      apiGet<EmailTemplate[]>("/communications/templates"),
      apiGet<NotificationSetting[]>("/communications/notifications"),
    ])
      .then(([tmpl, notif]) => {
        setTemplates(tmpl);
        setNotifications(notif);
        const drafts: Record<string, string> = {};
        notif.forEach((n) => { drafts[n.key] = n.recipient_emails.join(", "); });
        setEmailDrafts(drafts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleEnabled(key: string, enabled: boolean) {
    try {
      const updated = await apiPatch<NotificationSetting>(
        `/communications/notifications/${key}`,
        { enabled }
      );
      setNotifications((prev) =>
        prev.map((n) => (n.key === key ? { ...n, enabled: updated.enabled } : n))
      );
    } catch {
      setError("Failed to update notification setting");
    }
  }

  async function saveEmails(key: string) {
    const raw = emailDrafts[key] ?? "";
    const emails = raw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    try {
      await apiPatch(`/communications/notifications/${key}`, { recipient_emails: emails });
      setNotifications((prev) =>
        prev.map((n) => (n.key === key ? { ...n, recipient_emails: emails } : n))
      );
    } catch {
      setError("Failed to save recipient emails");
    }
  }

  return (
    <AdminShell>
      <div className="space-y-10">
        <div>
          <h1 className="font-serif text-2xl text-soil mb-1">Communications</h1>
          <p className="text-sm text-soil/60">Manage email templates and admin notification settings.</p>
        </div>

        {loading && <p className="text-sm text-soil/50">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Email Templates */}
        {!loading && (
          <section>
            <h2 className="font-serif text-lg text-soil mb-4">Email Templates</h2>
            <div className="bg-white rounded-2xl border border-linen overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-linen text-left">
                    <th className="px-5 py-3 font-medium text-soil/60">Template</th>
                    <th className="px-5 py-3 font-medium text-soil/60">Subject</th>
                    <th className="px-5 py-3 font-medium text-soil/60">Last updated</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.key} className="border-b border-linen last:border-0">
                      <td className="px-5 py-4">
                        <div className="font-medium text-soil">{t.name}</div>
                        {t.description && (
                          <div className="text-xs text-soil/50 mt-0.5">{t.description}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-soil/70 max-w-xs truncate">{t.subject}</td>
                      <td className="px-5 py-4 text-soil/50">{formatDate(t.updated_at)}</td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/communications/templates/${t.key}`}
                          className="text-clay text-sm hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Admin Notifications */}
        {!loading && (
          <section>
            <h2 className="font-serif text-lg text-soil mb-4">Admin Notifications</h2>
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.key}
                  className="bg-white rounded-2xl border border-linen px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-soil">{n.label}</div>
                      {n.description && (
                        <div className="text-xs text-soil/50 mt-0.5">{n.description}</div>
                      )}
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => toggleEnabled(n.key, !n.enabled)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        n.enabled ? "bg-moss" : "bg-linen"
                      }`}
                      role="switch"
                      aria-checked={n.enabled}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                          n.enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Recipient emails */}
                  <div className="mt-3">
                    <label className="text-xs text-soil/50 block mb-1">
                      Recipients (comma-separated)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={emailDrafts[n.key] ?? ""}
                        onChange={(e) =>
                          setEmailDrafts((prev) => ({ ...prev, [n.key]: e.target.value }))
                        }
                        onBlur={() => saveEmails(n.key)}
                        className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-linen focus:outline-none focus:ring-1 focus:ring-clay/30"
                        placeholder="hello@hammock.earth"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
