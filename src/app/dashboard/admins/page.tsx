"use client";

import { useEffect, useState } from "react";
import { SortableTable, Column } from "@/components/sortable-table";
import { Loading } from "@/components/loading";
import { ErrorMessage } from "@/components/error-message";
import { formatDate } from "@/lib/format";

interface Admin {
  id: string;
  name: string;
  email: string;
  created_at: string;
  organization_name: string;
  org_code: string;
  [key: string]: unknown;
}

const columns: Column<Admin>[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "organization_name", label: "Organization" },
  { key: "org_code", label: "Org Code" },
  {
    key: "created_at",
    label: "Created",
    render: (r) => formatDate(r.created_at),
  },
];

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admins");
        if (!res.ok) throw new Error();
        setAdmins(await res.json());
      } catch {
        setError("Failed to load admins.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admins</h2>
      <SortableTable columns={columns} data={admins} emptyMessage="No admins found." />
    </div>
  );
}
