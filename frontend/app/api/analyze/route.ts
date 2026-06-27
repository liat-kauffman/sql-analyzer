import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

export async function POST(req: NextRequest) {
  const { sql } = await req.json();

  if (!sql?.trim()) {
    return NextResponse.json({ error: "No SQL provided" }, { status: 400 });
  }

  // Write SQL to a temp file to avoid shell escaping issues
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

  return new Promise((resolve) => {
    const python = spawn("python3", ["-c", script]);

    let output = "";
    let error = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });
    python.stderr.on("data", (data) => {
      error += data.toString();
    });

    python.on("close", (code) => {
      fs.unlinkSync(tmpFile);
      if (code !== 0) {
        resolve(NextResponse.json({ error }, { status: 500 }));
      } else {
        resolve(NextResponse.json(JSON.parse(output.trim())));
      }
    });
  });
}
