"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateTimePicker } from "@/components/datetime-picker";
import { Loading } from "@/components/loading";
import { ErrorMessage } from "@/components/error-message";

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  req_id: string | null;
  method: string | null;
  url: string | null;
  status_code: number | null;
  response_time: number | null;
  container: string;
  host: string;
  pid: number | null;
  hostname: string;
}

const levelColors: Record<string, string> = {
  error: "bg-red-100 text-red-800",
  fatal: "bg-red-100 text-red-800",
  warn: "bg-yellow-100 text-yellow-800",
  info: "bg-green-100 text-green-800",
  debug: "bg-blue-100 text-blue-800",
  trace: "bg-gray-100 text-gray-800",
};

const statusCodeColor = (code: number | null) => {
  if (!code) return "";
  if (code >= 500) return "text-red-600 font-medium";
  if (code >= 400) return "text-orange-600 font-medium";
  if (code >= 300) return "text-yellow-600";
  return "text-green-600";
};

function formatTimestamp(ts: string) {
  if (!ts) return "-";
  const d = new Date(ts + "Z");
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

export default function LogsPage() {
  const [level, setLevel] = useState("all");
  const [method, setMethod] = useState("all");
  const [statusRange, setStatusRange] = useState("all");
  const [hideHealthcheck, setHideHealthcheck] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(
    () => new Date(Date.now() - 2 * 60 * 60 * 1000)
  );
  const [toDate, setToDate] = useState(() => new Date());
  const [limit, setLimit] = useState("10000");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      });
      if (level !== "all") params.set("level", level);
      if (method !== "all") params.set("method", method);
      if (statusRange !== "all") params.set("status_range", statusRange);
      if (hideHealthcheck) params.set("hide_healthcheck", "true");
      if (search) params.set("search", search);

      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch logs");

      setLogs(data.data || []);
      setExpandedRow(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs.");
    } finally {
      setLoading(false);
    }
  }, [level, method, statusRange, hideHealthcheck, search, fromDate, toDate, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 30000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchLogs]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Logs</h2>

      {/* Row 1: Date range, limit, refresh */}
      <div className="flex flex-wrap items-end gap-3">
        <DateTimePicker label="From" date={fromDate} onChange={setFromDate} />
        <DateTimePicker label="To" date={toDate} onChange={setToDate} />
        <Select value={limit} onValueChange={setLimit}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Limit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="500">500</SelectItem>
            <SelectItem value="1000">1000</SelectItem>
            <SelectItem value="5000">5000</SelectItem>
            <SelectItem value="10000">All</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchLogs} variant="outline">
          Refresh
        </Button>
        <Button
          onClick={() => setAutoRefresh(!autoRefresh)}
          variant={autoRefresh ? "default" : "outline"}
        >
          {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
        </Button>
      </div>

      {/* Row 2: Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusRange} onValueChange={setStatusRange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="2xx">2xx Success</SelectItem>
            <SelectItem value="3xx">3xx Redirect</SelectItem>
            <SelectItem value="4xx">4xx Client Error</SelectItem>
            <SelectItem value="5xx">5xx Server Error</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => setHideHealthcheck(!hideHealthcheck)}
          variant={hideHealthcheck ? "default" : "outline"}
          className="text-sm"
        >
          {hideHealthcheck ? "Healthchecks hidden" : "Showing healthchecks"}
        </Button>
        <Input
          placeholder="Search message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[220px]"
        />
      </div>

      {/* Results count */}
      {!loading && !error && (
        <p className="text-xs text-muted-foreground">
          {logs.length} log{logs.length !== 1 ? "s" : ""}
        </p>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : logs.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No logs found.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[70px]">Level</TableHead>
                <TableHead className="w-[60px]">Method</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="w-[60px]">Status</TableHead>
                <TableHead className="w-[80px]">Time (ms)</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Container</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, i) => (
                <>
                  <TableRow
                    key={i}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                  >
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={levelColors[log.level?.toLowerCase()] ?? ""}
                      >
                        {log.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.method && (
                        <Badge variant="outline">{log.method}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">
                      {log.url || "-"}
                    </TableCell>
                    <TableCell className={`font-mono text-xs ${statusCodeColor(log.status_code)}`}>
                      {log.status_code ?? "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.response_time != null ? `${log.response_time}` : "-"}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">
                      {log.message || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.container || "-"}
                    </TableCell>
                  </TableRow>
                  {expandedRow === i && (
                    <TableRow key={`${i}-detail`}>
                      <TableCell colSpan={8} className="bg-muted/30 p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <Detail label="Request ID" value={log.req_id} />
                          <Detail label="Method" value={log.method} />
                          <Detail label="URL" value={log.url} mono />
                          <Detail label="Status Code" value={log.status_code} />
                          <Detail
                            label="Response Time"
                            value={log.response_time != null ? `${log.response_time} ms` : null}
                          />
                          <Detail label="Level" value={log.level} />
                          <Detail label="Container" value={log.container} />
                          <Detail label="Host" value={log.host} />
                          <Detail label="Hostname" value={log.hostname} />
                          <Detail label="PID" value={log.pid} />
                        </div>
                        <div className="mt-3 text-sm">
                          <span className="text-muted-foreground text-xs font-medium">Message:</span>
                          <pre className="mt-1 p-2 rounded bg-muted text-xs whitespace-pre-wrap break-all">
                            {log.message || "-"}
                          </pre>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className={`text-sm ${mono ? "font-mono" : ""}`}>
        {value != null && value !== "" ? String(value) : "-"}
      </div>
    </div>
  );
}
