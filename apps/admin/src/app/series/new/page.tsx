"use client";

import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { SeriesForm } from "@/components/SeriesForm";
import { apiPost } from "@/lib/api";

export default function NewSeriesPage() {
  const router = useRouter();

  async function handleSubmit(data: Record<string, unknown>) {
    await apiPost("/series", data);
    router.push("/series");
  }

  return (
    <AdminShell>
      <div className="max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <a href="/series" className="text-sm text-charcoal/50 hover:text-charcoal">
            ← Series
          </a>
          <h1 className="font-serif text-2xl text-soil">New Series</h1>
        </div>
        <div className="bg-white rounded-2xl border border-linen p-8">
          <SeriesForm onSubmit={handleSubmit} submitLabel="Create Series" />
        </div>
      </div>
    </AdminShell>
  );
}
