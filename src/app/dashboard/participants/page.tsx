"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { SortableTable, Column } from "@/components/sortable-table";
import { Loading } from "@/components/loading";
import { ErrorMessage } from "@/components/error-message";
import { formatDate, formatCompletionTime, formatPercentage } from "@/lib/format";

interface Participant {
  id: string;
  name: string;
  email: string;
  gender: string | null;
  nationality: string | null;
  heats_joined: number;
  avg_completion: number | null;
  best_time_sec: number | null;
  last_active: string | null;
  [key: string]: unknown;
}

const columns: Column<Participant>[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "gender", label: "Gender" },
  { key: "nationality", label: "Nationality" },
  { key: "heats_joined", label: "Heats Joined" },
  {
    key: "avg_completion",
    label: "Avg Completion",
    render: (r) => formatPercentage(r.avg_completion),
  },
  {
    key: "best_time_sec",
    label: "Best Time",
    render: (r) => formatCompletionTime(r.best_time_sec),
  },
  {
    key: "last_active",
    label: "Last Active",
    render: (r) => formatDate(r.last_active),
  },
];

export default function ParticipantsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipants = useCallback(async (q: string) => {
    if (q.length < 2) {
      setData([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/participants?search=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError("Failed to search participants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchParticipants(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchParticipants]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Participants</h2>
      <Input
        placeholder="Search by name or email (min 2 chars)..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <SortableTable
          columns={columns}
          data={data}
          onRowClick={(p) => router.push(`/dashboard/participants/${p.id}`)}
          emptyMessage={search.length < 2 ? "Type at least 2 characters to search." : "No participants found."}
        />
      )}
    </div>
  );
}
