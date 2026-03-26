import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("admins")
      .select(`
        id, name, email, created_at,
        organizations(name, code)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const admins = (data || []).map((a) => {
      const org = a.organizations as unknown as { name: string; code: string } | null;
      return {
        id: a.id,
        name: a.name,
        email: a.email,
        created_at: a.created_at,
        organization_name: org?.name ?? "-",
        org_code: org?.code ?? "-",
      };
    });

    // Deduplicate by email + org_code, keep the earliest created
    const seen = new Map<string, typeof admins[0]>();
    for (const admin of admins) {
      const key = `${admin.email}::${admin.org_code}`;
      if (!seen.has(key)) {
        seen.set(key, admin);
      }
    }

    return NextResponse.json(Array.from(seen.values()));
  } catch {
    return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 });
  }
}
