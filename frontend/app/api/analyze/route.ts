import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

function runPython(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const python = spawn("python3", ["-c", script]);
    let output = "";
    let error = "";
    python.stdout.on("data", (data: Buffer) => { output += data.toString(); });
    python.stderr.on("data", (data: Buffer) => { error += data.toString(); });
    python.on("close", (code: number) => {
      if (code !== 0) reject(new Error(error));
      else resolve(output.trim());
    });
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { sql } = await req.json();

  if (!sql?.trim()) {
    return NextResponse.json({ error: "No SQL provided" }, { status: 400 });
  }

  const tmpFile = path.join(os.tmpdir(), `sql_${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, sql, "utf-8");

  const backendPath = path.join(process.cwd(), "../backend");

  const script = `
import sys, json
sys.path.insert(0, '${backendPath}')
from handler import analyze
with open('${tmpFile}', 'r') as f:
    sql = f.read()
print(json.dumps(analyze(sql)))
`;

  try {
    const output = await runPython(script);
    return NextResponse.json(JSON.parse(output));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}
