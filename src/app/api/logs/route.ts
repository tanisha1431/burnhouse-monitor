import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const level = searchParams.get("level") || "all";
    const search = searchParams.get("search") || "";
    const method = searchParams.get("method") || "all";
    const statusRange = searchParams.get("status_range") || "all";
    const hideHealthcheck = searchParams.get("hide_healthcheck") === "true";
    const from =
      searchParams.get("from") ||
      new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const to = searchParams.get("to") || new Date().toISOString();
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const username = process.env.BETTER_STACK_QUERY_USERNAME;
    const password = process.env.BETTER_STACK_QUERY_PASSWORD;
    const endpoint = process.env.BETTER_STACK_QUERY_ENDPOINT;
    const sourceTable = process.env.BETTER_STACK_SOURCE_TABLE;

    if (!username || !password || !endpoint || !sourceTable) {
      return NextResponse.json(
        {
          error:
            "Better Stack SQL API not configured. Set BETTER_STACK_QUERY_USERNAME, BETTER_STACK_QUERY_PASSWORD, BETTER_STACK_QUERY_ENDPOINT, and BETTER_STACK_SOURCE_TABLE in .env.local.",
        },
        { status: 500 }
      );
    }

    // Convert ISO dates to ClickHouse-compatible format (YYYY-MM-DD HH:MM:SS)
    const formatForCH = (iso: string) =>
      iso.replace("T", " ").replace("Z", "").split(".")[0];

    const conditions: string[] = [
      `dt >= '${formatForCH(from)}'`,
      `dt <= '${formatForCH(to)}'`,
      `raw NOT LIKE '%"container_name":"hyperlab-staging"%'`,
    ];

    if (level !== "all") {
      const escapedLevel = level.replace(/'/g, "\\'");
      conditions.push(`raw LIKE '%"level":"${escapedLevel}"%'`);
    }
    if (method !== "all") {
      const escapedMethod = method.replace(/'/g, "\\'");
      conditions.push(`raw LIKE '%"method":"${escapedMethod}"%'`);
    }
    if (statusRange !== "all") {
      // Match status codes by first digit: 2xx, 3xx, 4xx, 5xx
      conditions.push(`raw LIKE '%"statusCode":${statusRange[0]}%'`);
    }
    if (hideHealthcheck) {
      conditions.push(`raw NOT LIKE '%/healthcheck%'`);
    }
    if (search) {
      const escapedSearch = search.replace(/'/g, "\\'");
      conditions.push(`raw LIKE '%${escapedSearch}%'`);
    }

    const whereClause = conditions.join(" AND ");

    const sql = `
      SELECT dt, raw FROM (
        SELECT dt, raw FROM remote(${sourceTable}_logs)
        WHERE ${whereClause}
        UNION ALL
        SELECT dt, raw FROM s3Cluster(primary, ${sourceTable}_s3)
        WHERE _row_type = 1 AND ${whereClause}
      )
      ORDER BY dt DESC
      LIMIT ${limit}
      FORMAT JSON
    `;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization:
          "Basic " +
          Buffer.from(`${username}:${password}`).toString("base64"),
      },
      body: sql,
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Better Stack SQL API error: ${response.status} - ${text.slice(0, 500)}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Parse the raw JSON column from each row
    const logs = (result.data || []).map((row: { dt: string; raw: string }) => {
      try {
        const parsed = JSON.parse(row.raw);
        const msg = parsed.message || {};
        return {
          timestamp: row.dt,
          level: msg.level || "info",
          message: msg.msg || "",
          req_id: msg.reqId || null,
          method: msg.req?.method || null,
          url: msg.req?.url || null,
          status_code: msg.res?.statusCode || null,
          response_time: msg.responseTime ? Number(msg.responseTime.toFixed(2)) : null,
          container: parsed.docker?.container_name || "",
          host: parsed.docker?.host || "",
          pid: msg.pid || null,
          hostname: msg.hostname || "",
        };
      } catch {
        return {
          timestamp: row.dt,
          level: "info",
          message: row.raw,
          req_id: null,
          method: null,
          url: null,
          status_code: null,
          response_time: null,
          container: "",
          host: "",
          pid: null,
          hostname: "",
        };
      }
    });

    return NextResponse.json({ data: logs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch logs: ${message}` },
      { status: 500 }
    );
  }
}
