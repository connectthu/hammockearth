"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { SeriesForm } from "@/components/SeriesForm";
import { apiGet, apiPatch } from "@/lib/api";

export default function EditSeriesPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [series, setSeries] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<any>(`/series?admin=true`).then((list: any[]) => {
      const found = list.find((s: any) => s.id === id);
      setSeries(found ?? null);
      setLoading(false);
    });
  }, [id]);

  async function handleSubmit(data: Record<string, unknown>) {
    await apiPatch(`/series/${id}`, data);
    router.push("/series");
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="text-center py-20 text-charcoal/50">Loading...</div>
      </AdminShell>
    );
  }

  if (!series) {
    return (
      <AdminShell>
        <div className="text-center py-20 text-charcoal/50">Series not found.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <a href="/series" className="text-sm text-charcoal/50 hover:text-charcoal">
            ← Series
          </a>
          <h1 className="font-serif text-2xl text-soil">Edit Series</h1>
        </div>
        <div className="bg-white rounded-2xl border border-linen p-8">
          <SeriesForm
            initialData={series}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            isEdit
          />
        </div>
      </div>
    </AdminShell>
  );
}
