import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    const [userRes, registrationsRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, name, email, gender, nationality, date_of_birth, height_cm, weight_kg, phone_number")
        .eq("id", userId)
        .single(),
      supabase
        .from("heat_registrations")
        .select(`
          format,
          heats(heat_name, venue, date, heat_level),
          wave_participations(
            heat_waves(wave_number, status),
            wave_results(
              completion_percentage, completion_time_sec,
              final_rank, total_participants,
              active_time_sec, total_rest_time_sec, status
            )
          )
        `)
        .eq("user_id", userId),
    ]);

    if (userRes.error) throw userRes.error;
    if (registrationsRes.error) throw registrationsRes.error;

    const history = (registrationsRes.data || []).flatMap((hr) => {
      const heat = hr.heats as unknown as {
        heat_name: string;
        venue: string;
        date: string;
        heat_level: string;
      } | null;
      const wps = hr.wave_participations as unknown as Array<{
        heat_waves: { wave_number: number; status: string } | null;
        wave_results: {
          completion_percentage: number;
          completion_time_sec: number;
          final_rank: number | null;
          active_time_sec: number;
          total_rest_time_sec: number;
          status: string;
        } | null;
      }> | null;

      if (!wps || wps.length === 0) {
        // Registered but never participated in any wave
        return [{
          heat_name: heat?.heat_name ?? "-",
          venue: heat?.venue ?? "-",
          date: heat?.date ?? null,
          heat_level: heat?.heat_level ?? "-",
          format: hr.format,
          wave_number: null,
          wave_status: null,
          completion_percentage: null,
          completion_time_sec: null,
          final_rank: null,
          active_time_sec: null,
          total_rest_time_sec: null,
          result_status: null,
        }];
      }

      // One row per wave participation
      return wps.map((wp) => {
        const wr = wp.wave_results;
        return {
          heat_name: heat?.heat_name ?? "-",
          venue: heat?.venue ?? "-",
          date: heat?.date ?? null,
          heat_level: heat?.heat_level ?? "-",
          format: hr.format,
          wave_number: wp.heat_waves?.wave_number ?? null,
          wave_status: wp.heat_waves?.status ?? null,
          completion_percentage: wr?.completion_percentage ?? null,
          completion_time_sec: wr?.completion_time_sec ?? null,
          final_rank: wr?.final_rank ?? null,
          active_time_sec: wr?.active_time_sec ?? null,
          total_rest_time_sec: wr?.total_rest_time_sec ?? null,
          result_status: wr?.status ?? null,
        };
      });
    });

    history.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

    return NextResponse.json({ user: userRes.data, history });
  } catch {
    return NextResponse.json({ error: "Failed to fetch participant" }, { status: 500 });
  }
}
