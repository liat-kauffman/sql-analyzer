import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { sql, warnings } = await req.json();

  const warningList = warnings
    .map((w: { message: string }) => `- ${w.message}`)
    .join("\n");

  const prompt = `You are a SQL expert. A user submitted this SQL query:

\`\`\`sql
${sql}
\`\`\`

The following issues were detected:
${warningList}

Provide 1-2 improved versions of this query that fix the issues. For each version:
1. Show the improved SQL
2. One sentence explaining what you changed and why

Respond in this exact JSON format with no markdown or extra text:
{
  "suggestions": [
    {
      "sql": "SELECT id, name FROM users WHERE status = 'active' LIMIT 100",
      "explanation": "Replaced SELECT * with specific columns and added a LIMIT clause."
    }
  ]
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
