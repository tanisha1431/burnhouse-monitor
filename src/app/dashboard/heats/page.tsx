"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/date-picker";
import { SortableTable, Column } from "@/components/sortable-table";
import { Loading } from "@/components/loading";
import { ErrorMessage } from "@/components/error-message";
import { formatTime, formatDate, formatDateForQuery } from "@/lib/format";

interface Heat {
  id: string;
  heat_name: string;
  heat_code: string;
  venue: string;
  date: string;
  start_time: string;
  format: string;
  heat_level: string;
  created_at: string;
  total_waves: number;
  completed_waves: number;
  wave_status: string;
  [key: string]: unknown;
}

const statusColor: Record<string, string> = {
  waiting: "bg-yellow-100 text-yellow-800",
  ongoing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

export default function HeatsPage() {
  const router = useRouter();
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [format, setFormat] = useState("all");
  const [status, setStatus] = useState("all");
  const [heats, setHeats] = useState<Heat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHeats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", formatDateForQuery(fromDate));
      if (toDate) params.set("to", formatDateForQuery(toDate));
      if (format !== "all") params.set("format", format);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/heats?${params}`);
      if (!res.ok) throw new Error();
      setHeats(await res.json());
    } catch {
      setError("Failed to load heats.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, format, status]);

  useEffect(() => {
    fetchHeats();
  }, [fetchHeats]);

  const columns: Column<Heat>[] = [
    { key: "heat_name", label: "Name" },
    { key: "heat_code", label: "Code" },
    { key: "venue", label: "Venue" },
    {
      key: "created_at",
      label: "Created",
      render: (r) => formatDate(r.created_at),
    },
    { key: "start_time", label: "Start", render: (r) => formatTime(r.start_time) },
    { key: "format", label: "Format" },
    { key: "heat_level", label: "Level" },
    {
      key: "completed_waves",
      label: "Waves",
      render: (r) => `${r.completed_waves}/${r.total_waves}`,
    },
    {
      key: "wave_status",
      label: "Status",
      render: (r) => (
        <Badge variant="secondary" className={statusColor[r.wave_status] ?? ""}>
          {r.wave_status === "ongoing" ? "Ongoing" : r.wave_status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Heats</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">From</label>
          <DatePicker date={fromDate} onSelect={setFromDate} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">To</label>
          <DatePicker date={toDate} onSelect={setToDate} />
        </div>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            <SelectItem value="solo">Solo</SelectItem>
            <SelectItem value="team">Team</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <SortableTable
          columns={columns}
          data={heats}
          onRowClick={(h) => router.push(`/dashboard/heats/${h.id}`)}
          emptyMessage="No heats found for this period."
        />
      )}
    </div>
  );
}
