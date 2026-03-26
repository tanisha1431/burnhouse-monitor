"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SortableTable, Column } from "@/components/sortable-table";
import { Loading } from "@/components/loading";
import { ErrorMessage } from "@/components/error-message";
import { formatDate, formatCompletionTime, formatPercentage } from "@/lib/format";

interface User {
  name: string;
  email: string;
  gender: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  phone_number: string | null;
}

interface HeatHistory {
  heat_name: string;
  venue: string;
  date: string | null;
  heat_level: string;
  format: string;
  wave_number: number | null;
  wave_status: string | null;
  completion_percentage: number | null;
  completion_time_sec: number | null;
  final_rank: number | null;
  active_time_sec: number | null;
  total_rest_time_sec: number | null;
  result_status: string | null;
  [key: string]: unknown;
}

const statusColor: Record<string, string> = {
  waiting: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  dnf: "bg-red-100 text-red-800",
  gave_up: "bg-orange-100 text-orange-800",
};

const columns: Column<HeatHistory>[] = [
  { key: "heat_name", label: "Heat" },
  { key: "venue", label: "Venue" },
  { key: "date", label: "Date", render: (r) => formatDate(r.date) },
  { key: "heat_level", label: "Level" },
  { key: "format", label: "Format" },
  { key: "wave_number", label: "Wave" },
  {
    key: "result_status",
    label: "Result",
    render: (r) => {
      const status = r.result_status || r.wave_status;
      if (!status) return "-";
      return (
        <Badge variant="secondary" className={statusColor[status] ?? ""}>
          {status === "gave_up" ? "Gave Up" : status === "dnf" ? "DNF" : status === "in_progress" ? "Ongoing" : status}
        </Badge>
      );
    },
  },
  {
    key: "completion_percentage",
    label: "Completion",
    render: (r) => formatPercentage(r.completion_percentage),
  },
  {
    key: "completion_time_sec",
    label: "Time",
    render: (r) => formatCompletionTime(r.completion_time_sec),
  },
  {
    key: "final_rank",
    label: "Rank",
    render: (r) =>
      r.final_rank != null ? `#${r.final_rank}` : "-",
  },
];

export default function ParticipantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HeatHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/participants/${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUser(data.user);
        setHistory(data.history);
      } catch {
        setError("Failed to load participant.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!user) return <ErrorMessage message="Participant not found." />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{user.name || "Unknown"}</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{user.email ?? "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Gender:</span>{" "}
              <span className="font-medium">{user.gender ?? "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nationality:</span>{" "}
              <span className="font-medium">{user.nationality ?? "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">DOB:</span>{" "}
              <span className="font-medium">{formatDate(user.date_of_birth)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Height:</span>{" "}
              <span className="font-medium">
                {user.height_cm ? `${user.height_cm} cm` : "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Weight:</span>{" "}
              <span className="font-medium">
                {user.weight_kg ? `${user.weight_kg} kg` : "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Phone:</span>{" "}
              <span className="font-medium">{user.phone_number ?? "-"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <div>
        <h3 className="text-lg font-semibold mb-3">Heat History ({history.length})</h3>
        <SortableTable columns={columns} data={history} emptyMessage="No heat history." />
      </div>
    </div>
  );
}
