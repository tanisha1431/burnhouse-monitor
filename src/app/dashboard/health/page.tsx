"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SortableTable, Column } from "@/components/sortable-table";
import { Loading } from "@/components/loading";
import { ErrorMessage } from "@/components/error-message";

interface Monitor {
  id: string;
  attributes: {
    url: string;
    pronounceable_name: string;
    status: string;
    uptime?: number;
    last_checked_at: string;
  };
}

interface SlowEndpoint {
  url: string;
  avg_response_time: number;
  count: number;
  [key: string]: unknown;
}

const endpointColumns: Column<SlowEndpoint>[] = [
  { key: "url", label: "URL" },
  { key: "avg_response_time", label: "Avg Response Time (ms)" },
  { key: "count", label: "Requests" },
];

export default function HealthPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [slowEndpoints, setSlowEndpoints] = useState<SlowEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/health");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMonitors(data.monitors || []);
        setSlowEndpoints(data.slowEndpoints || []);
      } catch {
        setError("Failed to load health data.");
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
      <h2 className="text-2xl font-bold">Health</h2>

      <div>
        <h3 className="text-lg font-semibold mb-3">Monitors</h3>
        {monitors.length === 0 ? (
          <p className="text-muted-foreground text-sm">No monitors configured.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {monitors.map((m) => {
              const isUp = m.attributes.status === "up";
              return (
                <Card key={m.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      {m.attributes.pronounceable_name || m.attributes.url}
                      <Badge
                        variant="secondary"
                        className={isUp ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {m.attributes.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {m.attributes.uptime != null && (
                      <div>
                        <span className="text-muted-foreground">Uptime:</span>{" "}
                        {m.attributes.uptime}%
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Last checked:</span>{" "}
                      {m.attributes.last_checked_at
                        ? new Date(m.attributes.last_checked_at).toLocaleString("en-GB")
                        : "-"}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Slowest Endpoints (24h)</h3>
        <SortableTable
          columns={endpointColumns}
          data={slowEndpoints}
          emptyMessage="No endpoint data available."
        />
      </div>
    </div>
  );
}
