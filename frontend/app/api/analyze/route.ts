import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/analyzer";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { sql } = await req.json();
  if (!sql?.trim()) {
    return NextResponse.json({ error: "No SQL provided" }, { status: 400 });
  }
  return NextResponse.json(analyze(sql));
}
