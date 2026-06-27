"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

type Warning = { type: string; severity: string; message: string };
type Result = { explanation: string; warnings: Warning[]; score: number };

const EXAMPLES = [
  {
    label: "SELECT *",
    sql: "SELECT * FROM users WHERE id IN (SELECT id FROM admins)",
  },
  {
    label: "JOIN",
    sql: "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE o.total > 100 ORDER BY o.total DESC LIMIT 10",
  },
  { label: "No WHERE", sql: "SELECT email FROM customers" },
];

export default function Home() {
  const [sql, setSql] = useState(EXAMPLES[0].sql);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { theme, setTheme } = useTheme();

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setSql("");
    setResult(null);
    setError(null);
  }

  function copy() {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const warningCount =
    result?.warnings.filter((w) => w.severity === "warning").length ?? 0;
  const infoCount =
    result?.warnings.filter((w) => w.severity === "info").length ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">SQL Analyzer</h1>
          <p className="text-xs text-muted-foreground">
            Explain and lint your queries instantly
          </p>
        </div>
        <div className="flex gap-2">
          {EXAMPLES.map((ex) => (
            <Button
              key={ex.label}
              variant="outline"
              size="sm"
              onClick={() => {
                setSql(ex.sql);
                setResult(null);
                setError(null);
              }}
            >
              {ex.label}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </Button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Editor card */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Query
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={copy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" onClick={clear}>
                Clear
              </Button>
              <Button
                size="sm"
                onClick={analyze}
                disabled={loading || !sql.trim()}
              >
                {loading ? "Analyzing..." : "Analyze →"}
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <MonacoEditor
              height="220px"
              language="sql"
              value={sql}
              onChange={(v) => setSql(v ?? "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                fontFamily: "var(--font-mono, monospace)",
              }}
            />
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-4 text-sm text-destructive">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Score */}
            <Card>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Query score
                  </p>
                  <p className="text-3xl font-semibold">
                    {result.score}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      / 100
                    </span>
                  </p>
                </div>
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-4 ${
                    result.score >= 80
                      ? "border-green-500 text-green-500"
                      : result.score >= 50
                        ? "border-yellow-500 text-yellow-500"
                        : "border-red-500 text-red-500"
                  }`}
                >
                  {result.score}
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Explanation */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Explanation
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4 text-sm leading-relaxed">
                  {result.explanation}
                </CardContent>
              </Card>

              {/* Warnings */}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Warnings
                  </CardTitle>
                  <div className="flex gap-1">
                    {warningCount > 0 && (
                      <Badge variant="destructive">
                        {warningCount} warning{warningCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                    {infoCount > 0 && (
                      <Badge variant="secondary">{infoCount} info</Badge>
                    )}
                    {result.warnings.length === 0 && (
                      <Badge variant="secondary">Clean ✓</Badge>
                    )}
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4 flex flex-col gap-3">
                  {result.warnings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No issues found.
                    </p>
                  ) : (
                    result.warnings.map((w, i) => (
                      <div
                        key={i}
                        className={`rounded-lg px-3 py-2 text-sm border-l-4 ${
                          w.severity === "warning"
                            ? "bg-yellow-50 border-yellow-400 dark:bg-yellow-950/30"
                            : "bg-blue-50 border-blue-400 dark:bg-blue-950/30"
                        }`}
                      >
                        <p className="font-medium capitalize mb-0.5">
                          {w.severity === "warning" ? "⚠️" : "ℹ️"}{" "}
                          {w.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-muted-foreground">{w.message}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
