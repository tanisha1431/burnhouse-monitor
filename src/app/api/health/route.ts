import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.BETTER_STACK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "BETTER_STACK_API_KEY not configured" }, { status: 500 });
    }

    const username = process.env.BETTER_STACK_QUERY_USERNAME;
    const password = process.env.BETTER_STACK_QUERY_PASSWORD;
    const endpoint = process.env.BETTER_STACK_QUERY_ENDPOINT;
    const sourceTable = process.env.BETTER_STACK_SOURCE_TABLE;
    const hasQueryApi = username && password && endpoint && sourceTable;

    // Fetch monitors (always works with the API key)
    const monitorsRes = await fetch("https://uptime.betterstack.com/api/v2/monitors", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    let monitors = [];
    if (monitorsRes.ok) {
      const monitorsData = await monitorsRes.json();
      monitors = monitorsData.data || [];
    }

    // Fetch slow endpoints via SQL API (if configured)
    let slowEndpoints: { url: string; avg_response_time: number; count: number }[] = [];
    if (hasQueryApi) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const sql = `
        SELECT
          \`http.path\` AS url,
          avg(toFloat64OrZero(toString(\`http.duration\`))) AS avg_response_time,
          count() AS count
        FROM remote(${sourceTable}_logs)
        WHERE dt >= '${since}' AND \`http.path\` != ''
        GROUP BY url
        ORDER BY avg_response_time DESC
        LIMIT 10
        FORMAT JSON
      `;

      try {
        const logsRes = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
            Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
          },
          body: sql,
        });

        if (logsRes.ok) {
          const data = await logsRes.json();
          slowEndpoints = (data.data || []).map((row: Record<string, unknown>) => ({
            url: row.url || "",
            avg_response_time: Math.round(Number(row.avg_response_time) || 0),
            count: Number(row.count) || 0,
          }));
        }
      } catch {
        // SQL API query failed, continue with empty slow endpoints
      }
    }

    return NextResponse.json({ monitors, slowEndpoints });
  } catch {
    return NextResponse.json({ error: "Failed to fetch health data" }, { status: 500 });
  }
}
