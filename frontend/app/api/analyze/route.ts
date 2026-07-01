import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { sql } = await req.json();

  if (!sql?.trim()) {
    return NextResponse.json({ error: "No SQL provided" }, { status: 400 });
  }

  const lambdaUrl = process.env.LAMBDA_API_URL ?? "";

  const res = await fetch(`${lambdaUrl}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
