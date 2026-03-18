"use client";

import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { ContentForm } from "@/components/ContentForm";

export default function NewContentPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/content" className="text-sm text-clay hover:underline">
            ← Content Library
          </Link>
        </div>
        <div>
          <h1 className="font-serif text-2xl text-soil">New Content Item</h1>
        </div>
        <ContentForm mode="create" />
      </div>
    </AdminShell>
  );
}
