import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const now = new Date();
    const from = searchParams.get("from") || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const to = searchParams.get("to") || from;
    const format = searchParams.get("format") || "all";
    const status = searchParams.get("status") || "all";

    const rangeStart = `${from}T00:00:00.000Z`;
    const rangeEnd = `${to}T23:59:59.999Z`;

    // Step 1: Find heat_ids where waves were completed in range OR are in_progress
    const { data: waves, error: wavesError } = await supabase
      .from("heat_waves")
      .select("heat_id, status, completed_at")
      .or(
        `and(completed_at.gte.${rangeStart},completed_at.lte.${rangeEnd}),status.eq.in_progress`
      );

    if (wavesError) throw wavesError;

    const heatIds = Array.from(new Set((waves || []).map((w) => w.heat_id)));

    if (heatIds.length === 0) {
      return NextResponse.json([]);
    }

    // Step 2: Fetch those heats with registrations and all their waves
    let query = supabase
      .from("heats")
      .select(`
        id, heat_name, heat_code, venue, date, start_time, format, heat_level, created_at,
        heat_waves(status, completed_at, wave_number)
      `)
      .in("id", heatIds)
      .order("created_at", { ascending: false });

    if (format !== "all") {
      query = query.eq("format", format);
    }

    const { data, error } = await query;
    if (error) throw error;

    const heats = (data || []).map((h) => {
      const allWaves = h.heat_waves as unknown as {
        status: string;
        completed_at: string | null;
        wave_number: number;
      }[] | null;

      const waveStatuses = allWaves?.map((w) => w.status) ?? [];
      const hasInProgress = waveStatuses.includes("in_progress");
      const allCompleted =
        waveStatuses.length > 0 && waveStatuses.every((s) => s === "completed");

      let waveStatus: string;
      if (hasInProgress) {
        waveStatus = "ongoing";
      } else if (allCompleted) {
        waveStatus = "completed";
      } else {
        waveStatus = "waiting";
      }

      return {
        id: h.id,
        heat_name: h.heat_name,
        heat_code: h.heat_code,
        venue: h.venue,
        date: h.date,
        start_time: h.start_time,
        format: h.format,
        heat_level: h.heat_level,
        created_at: h.created_at,
        total_waves: allWaves?.length ?? 0,
        completed_waves: waveStatuses.filter((s) => s === "completed").length,
        wave_status: waveStatus,
      };
    });

    const filtered =
      status !== "all" ? heats.filter((h) => h.wave_status === status) : heats;

    return NextResponse.json(filtered);
  } catch {
    return NextResponse.json({ error: "Failed to fetch heats" }, { status: 500 });
  }
}
