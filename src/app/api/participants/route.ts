import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") || "";

    if (!search || search.length < 2) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabase
      .from("users")
      .select(`
        id, name, email, gender, nationality,
        heat_registrations(
          heat_id,
          heats(date),
          wave_participations(
            wave_results(completion_percentage, completion_time_sec)
          )
        )
      `)
      .or(`name.ilike.%${search}%,email.ilike.%${search}%`)
      .limit(50);

    if (error) throw error;

    const participants = (data || []).map((u) => {
      const regs = u.heat_registrations as unknown as Array<{
        heat_id: string;
        heats: { date: string } | null;
        wave_participations: Array<{
          wave_results: {
            completion_percentage: number;
            completion_time_sec: number;
          } | null;
        }> | null;
      }> | null;

      const heatIds = new Set(regs?.map((r) => r.heat_id) ?? []);
      const allResults = regs?.flatMap(
        (r) =>
          r.wave_participations
            ?.map((wp) => wp.wave_results)
            .filter((wr): wr is NonNullable<typeof wr> => wr != null) ?? []
      ) ?? [];
      const dates = regs?.map((r) => r.heats?.date).filter(Boolean) as string[] ?? [];

      const avgCompletion =
        allResults.length > 0
          ? allResults.reduce((s, r) => s + Number(r.completion_percentage), 0) /
            allResults.length
          : null;
      const bestTime =
        allResults.length > 0
          ? Math.min(...allResults.map((r) => r.completion_time_sec))
          : null;
      const lastActive = dates.length > 0 ? dates.sort().reverse()[0] : null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        gender: u.gender,
        nationality: u.nationality,
        heats_joined: heatIds.size,
        avg_completion: avgCompletion ? Number(avgCompletion.toFixed(1)) : null,
        best_time_sec: bestTime === Infinity ? null : bestTime,
        last_active: lastActive,
      };
    });

    participants.sort((a, b) => {
      if (!a.last_active && !b.last_active) return 0;
      if (!a.last_active) return 1;
      if (!b.last_active) return -1;
      return b.last_active.localeCompare(a.last_active);
    });

    return NextResponse.json(participants);
  } catch {
    return NextResponse.json({ error: "Failed to fetch participants" }, { status: 500 });
  }
}
