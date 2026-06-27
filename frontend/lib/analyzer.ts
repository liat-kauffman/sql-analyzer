export type Warning = { type: string; severity: string; message: string };
export type Analysis = {
  explanation: string;
  warnings: Warning[];
  score: number;
};

function normalize(sql: string) {
  return sql.replace(/\s+/g, " ").trim().toUpperCase();
}

export function analyze(sql: string): Analysis {
  const upper = normalize(sql);
  const warnings: Warning[] = [];

  if (upper.includes("SELECT *"))
    warnings.push({
      type: "select_star",
      severity: "warning",
      message: "Avoid SELECT * — specify only the columns you need.",
    });

  if (/SELECT\s/.test(upper) && !upper.includes("WHERE"))
    warnings.push({
      type: "missing_where",
      severity: "info",
      message: "No WHERE clause — this query will scan the entire table.",
    });

  if (upper.includes("IN (SELECT"))
    warnings.push({
      type: "subquery_in_where",
      severity: "warning",
      message: "Subquery in WHERE detected — consider rewriting as a JOIN.",
    });

  if (/SELECT\s/.test(upper) && !upper.includes("LIMIT"))
    warnings.push({
      type: "missing_limit",
      severity: "info",
      message:
        "No LIMIT clause — could return millions of rows on large tables.",
    });

  if (upper.includes("LIKE '%"))
    warnings.push({
      type: "leading_wildcard",
      severity: "warning",
      message:
        "LIKE with a leading wildcard can't use indexes — very slow on large tables.",
    });

  if (upper.includes("SELECT *") && upper.includes("JOIN"))
    warnings.push({
      type: "select_star_with_join",
      severity: "warning",
      message:
        "SELECT * with JOIN returns all columns from all tables — be explicit.",
    });

  const score = Math.max(
    0,
    100 -
      warnings.reduce((acc, w) => acc + (w.severity === "warning" ? 15 : 5), 0),
  );

  const explanation = explain(sql);
  return { explanation, warnings, score };
}

function explain(sql: string): string {
  const upper = normalize(sql);
  const parts: string[] = [];

  if (upper.startsWith("SELECT")) {
    const hasStar = upper.includes("SELECT *");
    parts.push(`Selects ${hasStar ? "all columns" : "specific columns"}`);

    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    if (fromMatch) parts.push(`from the '${fromMatch[1]}' table`);

    const joinMatch = sql.match(/JOIN\s+(\w+)/gi);
    if (joinMatch)
      joinMatch.forEach((j) => {
        const t = j.replace(/JOIN\s+/i, "");
        parts.push(`joined with '${t}'`);
      });

    if (upper.includes("WHERE")) {
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/i);
      if (whereMatch) parts.push(`filtered by: ${whereMatch[1].trim()}`);
    }

    if (upper.includes("GROUP BY")) {
      const m = sql.match(/GROUP BY\s+(.+?)(?:ORDER|LIMIT|HAVING|$)/i);
      if (m) parts.push(`grouped by ${m[1].trim()}`);
    }

    if (upper.includes("ORDER BY")) {
      const m = sql.match(/ORDER BY\s+(.+?)(?:LIMIT|$)/i);
      if (m) parts.push(`ordered by ${m[1].trim()}`);
    }

    if (upper.includes("LIMIT")) {
      const m = sql.match(/LIMIT\s+(\d+)/i);
      if (m) parts.push(`limited to ${m[1]} rows`);
    }
  } else if (upper.startsWith("INSERT")) {
    const m = sql.match(/INTO\s+(\w+)/i);
    parts.push(`Inserts a new row into '${m?.[1] ?? "unknown"}'`);
  } else if (upper.startsWith("UPDATE")) {
    const m = sql.match(/UPDATE\s+(\w+)/i);
    parts.push(`Updates rows in '${m?.[1] ?? "unknown"}'`);
  } else if (upper.startsWith("DELETE")) {
    const m = sql.match(/FROM\s+(\w+)/i);
    parts.push(`Deletes rows from '${m?.[1] ?? "unknown"}'`);
  } else {
    parts.push("SQL statement detected");
  }

  return parts.join(", ") + ".";
}
