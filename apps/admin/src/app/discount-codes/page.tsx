"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatValue(type: string, value: number) {
  if (type === "percent") return `${value}%`;
  return `$${(value / 100).toFixed(2)}`;
}

function statusBadge(code: any) {
  const now = new Date();
  if (code.valid_until && new Date(code.valid_until) < now)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Expired</span>;
  if (code.max_uses !== null && code.used_count >= code.max_uses)
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Used up</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
}

const emptyForm = {
  code: "",
  description: "",
  discount_type: "percent" as "percent" | "fixed",
  discount_value: "",
  max_uses: "",
  valid_from: "",
  valid_until: "",
  members_only: false,
};

export default function DiscountCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<any[]>("/discount-codes");
      setCodes(data);
    } catch {
      setError("Failed to load discount codes.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.code.trim()) { setFormError("Code is required."); return; }
    if (!form.discount_value) { setFormError("Discount value is required."); return; }

    setSaving(true);
    try {
      const payload: any = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        members_only: form.members_only,
      };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.max_uses) payload.max_uses = parseInt(form.max_uses, 10);
      if (form.valid_from) payload.valid_from = new Date(form.valid_from).toISOString();
      if (form.valid_until) payload.valid_until = new Date(form.valid_until).toISOString();

      const created = await apiPost<any>("/discount-codes", payload);
      setCodes((prev) => [created, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (e: any) {
      setFormError(e.message ?? "Failed to create discount code.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Delete discount code "${code}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await apiDelete(`/discount-codes/${id}`);
      setCodes((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("Failed to delete discount code.");
    } finally {
      setDeletingId(null);
    }
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border border-linen text-sm focus:outline-none focus:ring-2 focus:ring-clay/30 bg-white";

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-soil">Discount Codes</h1>
        <button
          onClick={() => { setShowForm(true); setFormError(""); }}
          className="bg-clay text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-clay/90 transition-colors"
        >
          + New Code
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-linen p-6 mb-6">
          <h2 className="font-medium text-soil mb-4">New Discount Code</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-charcoal/60 mb-1">Code *</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className={inputCls}
                  placeholder="SUMMER20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal/60 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputCls}
                  placeholder="Summer discount"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-charcoal/60 mb-1">Type *</label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })}
                  className={inputCls}
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed amount ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal/60 mb-1">
                  Value * {form.discount_type === "percent" ? "(0–100)" : "(in cents, e.g. 1000 = $10)"}
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  className={inputCls}
                  placeholder={form.discount_type === "percent" ? "20" : "1000"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-charcoal/60 mb-1">Max uses</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  className={inputCls}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal/60 mb-1">Valid from</label>
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-charcoal/60 mb-1">Valid until</label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.members_only}
                onChange={(e) => setForm({ ...form, members_only: e.target.checked })}
                className="rounded border-linen text-clay focus:ring-clay/30"
              />
              <span className="text-sm text-charcoal/70">Members only</span>
            </label>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); }}
                className="text-sm text-charcoal/50 hover:text-charcoal px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-clay text-white text-sm font-medium px-6 py-2 rounded-full hover:bg-clay/90 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Create code"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="text-center py-20 text-charcoal/50">Loading...</div>}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && codes.length === 0 && (
        <div className="text-center py-20 text-charcoal/50">No discount codes yet.</div>
      )}

      {codes.length > 0 && (
        <div className="bg-white rounded-2xl border border-linen overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-linen bg-linen/50">
                <th className="text-left px-4 py-3 font-medium text-charcoal/60">Code</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden sm:table-cell">Discount</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden md:table-cell">Uses</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60 hidden lg:table-cell">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-charcoal/60">Status</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-linen last:border-0 hover:bg-linen/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono font-medium text-soil">{c.code}</p>
                    {c.description && (
                      <p className="text-xs text-charcoal/50 mt-0.5">{c.description}</p>
                    )}
                    {c.members_only && (
                      <span className="text-[10px] font-medium text-clay bg-clay/10 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                        Members only
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-charcoal/70 hidden sm:table-cell">
                    {formatValue(c.discount_type, c.discount_value)}
                  </td>
                  <td className="px-4 py-3 text-charcoal/70 hidden md:table-cell">
                    {c.used_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-charcoal/70 hidden lg:table-cell">
                    {c.valid_until ? formatDate(c.valid_until) : "—"}
                  </td>
                  <td className="px-4 py-3">{statusBadge(c)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(c.id, c.code)}
                      disabled={deletingId === c.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                    >
                      {deletingId === c.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
