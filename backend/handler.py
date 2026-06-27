import json
from analyzer.explainer import explain
from analyzer.linter import lint, score

def analyze(sql: str) -> dict:
    warnings = lint(sql)
    return {
        "explanation": explain(sql),
        "warnings": warnings,
        "score": score(warnings),
    }

if __name__ == "__main__":
    test_sql = "SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers)"
    result = analyze(test_sql)
    print(json.dumps(result, indent=2))