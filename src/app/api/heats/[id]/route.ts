import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const heatId = params.id;

    const [heatRes, registrationsRes, wavesRes] = await Promise.all([
      // Heat info
      supabase
        .from("heats")
        .select("id, heat_name, heat_code, venue, date, start_time, format, heat_level, created_at")
        .eq("id", heatId)
        .single(),

      // Heat registrations (who signed up)
      supabase
        .from("heat_registrations")
        .select(`
          id, format, created_at,
          users(name, email)
        `)
        .eq("heat_id", heatId)
        .order("created_at", { ascending: true }),

      // All waves for this heat with their participations and results
      supabase
        .from("heat_waves")
        .select(`
          id, wave_number, status, completed_at,
          wave_participations(
            id,
            heat_registrations(
              users(name, email)
            ),
            wave_results(
              completion_percentage, completion_time_sec,
              final_rank, total_participants,
              active_time_sec, total_rest_time_sec, status
            )
          )
        `)
        .eq("heat_id", heatId)
        .order("wave_number", { ascending: true }),
    ]);

    if (heatRes.error) throw heatRes.error;
    if (registrationsRes.error) throw registrationsRes.error;
    if (wavesRes.error) throw wavesRes.error;

    // Format registrations
    const registrations = (registrationsRes.data || []).map((hr) => {
      const user = hr.users as unknown as { name: string; email: string } | null;
      return {
        name: user?.name ?? "-",
        email: user?.email ?? "-",
        format: hr.format,
        registered_at: hr.created_at,
      };
    });

    // Format waves with participants
    const waves = (wavesRes.data || []).map((hw) => {
      const participations = hw.wave_participations as unknown as Array<{
        id: string;
        heat_registrations: {
          users: { name: string; email: string } | null;
        } | null;
        wave_results: {
          completion_percentage: number;
          completion_time_sec: number;
          final_rank: number | null;
          total_participants: number | null;
          active_time_sec: number;
          total_rest_time_sec: number;
          status: string;
        } | null;
      }> | null;

      const participants = (participations || []).map((wp) => {
        const user = wp.heat_registrations?.users ?? null;
        const wr = wp.wave_results;
        return {
          name: user?.name ?? "-",
          email: user?.email ?? "-",
          completion_percentage: wr?.completion_percentage ?? null,
          completion_time_sec: wr?.completion_time_sec ?? null,
          final_rank: wr?.final_rank ?? null,
          total_participants: wr?.total_participants ?? null,
          active_time_sec: wr?.active_time_sec ?? null,
          total_rest_time_sec: wr?.total_rest_time_sec ?? null,
          result_status: wr?.status ?? null,
        };
      });

      // Sort by final_rank, nulls last
      participants.sort((a, b) => {
        if (a.final_rank == null && b.final_rank == null) return 0;
        if (a.final_rank == null) return 1;
        if (b.final_rank == null) return -1;
        return a.final_rank - b.final_rank;
      });

      return {
        wave_number: hw.wave_number,
        status: hw.status,
        completed_at: hw.completed_at,
        participant_count: participants.length,
        participants,
      };
    });

    return NextResponse.json({
      heat: heatRes.data,
      registrations,
      waves,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch heat details" }, { status: 500 });
  }
}
