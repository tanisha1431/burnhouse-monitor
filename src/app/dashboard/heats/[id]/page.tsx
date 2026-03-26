"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SortableTable, Column } from "@/components/sortable-table";
import { Loading } from "@/components/loading";
import { ErrorMessage } from "@/components/error-message";
import {
  formatDate,
  formatTime,
  formatCompletionTime,
  formatPercentage,
} from "@/lib/format";

interface HeatInfo {
  heat_name: string;
  heat_code: string;
  venue: string;
  date: string;
  start_time: string;
  format: string;
  heat_level: string;
  created_at: string;
}

interface Registration {
  name: string;
  email: string;
  format: string;
  registered_at: string;
  [key: string]: unknown;
}

interface WaveParticipant {
  name: string;
  email: string;
  completion_percentage: number | null;
  completion_time_sec: number | null;
  final_rank: number | null;
  total_participants: number | null;
  active_time_sec: number | null;
  total_rest_time_sec: number | null;
  result_status: string | null;
  [key: string]: unknown;
}

interface Wave {
  wave_number: number;
  status: string;
  completed_at: string | null;
  participant_count: number;
  participants: WaveParticipant[];
}

const waveStatusColor: Record<string, string> = {
  waiting: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

const registrationColumns: Column<Registration>[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "format", label: "Format" },
  {
    key: "registered_at",
    label: "Registered",
    render: (r) => {
      if (!r.registered_at) return "-";
      return new Date(r.registered_at).toLocaleString("en-GB");
    },
  },
];

const resultStatusColor: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  dnf: "bg-red-100 text-red-800",
  gave_up: "bg-orange-100 text-orange-800",
  in_progress: "bg-blue-100 text-blue-800",
};

const waveParticipantColumns: Column<WaveParticipant>[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  {
    key: "result_status",
    label: "Status",
    render: (r) => {
      if (!r.result_status) return "-";
      return (
        <Badge
          variant="secondary"
          className={resultStatusColor[r.result_status] ?? ""}
        >
          {r.result_status === "gave_up" ? "Gave Up" : r.result_status === "dnf" ? "DNF" : r.result_status}
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
      r.final_rank != null
        ? `#${r.final_rank}`
        : "-",
  },
  {
    key: "active_time_sec",
    label: "Active",
    render: (r) => formatCompletionTime(r.active_time_sec),
  },
  {
    key: "total_rest_time_sec",
    label: "Rest",
    render: (r) => formatCompletionTime(r.total_rest_time_sec),
  },
];

export default function HeatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [heat, setHeat] = useState<HeatInfo | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [waves, setWaves] = useState<Wave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/heats/${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setHeat(data.heat);
        setRegistrations(data.registrations);
        setWaves(data.waves);
      } catch {
        setError("Failed to load heat details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!heat) return <ErrorMessage message="Heat not found." />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{heat.heat_name}</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Heat Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Code:</span>{" "}
              <span className="font-medium">{heat.heat_code}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Venue:</span>{" "}
              <span className="font-medium">{heat.venue || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              <span className="font-medium">{formatDate(heat.created_at)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Start:</span>{" "}
              <span className="font-medium">{formatTime(heat.start_time)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Format:</span>{" "}
              <span className="font-medium">{heat.format}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Level:</span>{" "}
              <span className="font-medium">{heat.heat_level}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heat Registrations */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          Registrations ({registrations.length})
        </h3>
        <SortableTable
          columns={registrationColumns}
          data={registrations}
          emptyMessage="No registrations."
        />
      </div>

      {/* Wave-wise Participants */}
      {waves.map((wave) => (
        <div key={wave.wave_number}>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold">
              Wave {wave.wave_number}
            </h3>
            <Badge
              variant="secondary"
              className={waveStatusColor[wave.status] ?? ""}
            >
              {wave.status === "in_progress" ? "Ongoing" : wave.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {wave.participant_count} participant{wave.participant_count !== 1 ? "s" : ""}
            </span>
            {wave.completed_at && (
              <span className="text-sm text-muted-foreground">
                Completed: {new Date(wave.completed_at).toLocaleString("en-GB")}
              </span>
            )}
          </div>
          <SortableTable
            columns={waveParticipantColumns}
            data={wave.participants}
            emptyMessage="No participants in this wave."
          />
        </div>
      ))}

      {waves.length === 0 && (
        <p className="text-muted-foreground text-sm">No waves created yet.</p>
      )}
    </div>
  );
}
