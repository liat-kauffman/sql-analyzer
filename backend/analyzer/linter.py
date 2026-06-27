import sqlglot
import sqlglot.expressions as exp

def lint(sql: str) -> list[dict]:
    warnings = []
    tree = sqlglot.parse_one(sql)

    # SELECT * check
    for select in tree.find_all(exp.Star):
        warnings.append({
            "type": "select_star",
            "severity": "warning",
            "message": "Avoid SELECT * — specify only the columns you need to reduce data transfer and prevent breakage if the schema changes."
        })

    # Missing WHERE on SELECT
    if isinstance(tree, exp.Select):
        if not tree.find(exp.Where):
            warnings.append({
                "type": "missing_where",
                "severity": "info",
                "message": "No WHERE clause — this query will scan the entire table."
            })

    # SELECT inside a loop pattern (subquery in WHERE)
    for subquery in tree.find_all(exp.Subquery):
        parent = subquery.parent
        if isinstance(parent, exp.In) or isinstance(parent, exp.Where):
            warnings.append({
                "type": "subquery_in_where",
                "severity": "warning",
                "message": "Subquery in WHERE detected — consider rewriting as a JOIN for better performance."
            })

    # No LIMIT on SELECT
    if isinstance(tree, exp.Select):
        if not tree.find(exp.Limit):
            warnings.append({
                "type": "missing_limit",
                "severity": "info",
                "message": "No LIMIT clause — on large tables this could return millions of rows."
            })

    return warnings

def score(warnings: list[dict]) -> int:
    deductions = {"warning": 15, "info": 5}
    total = 100
    for w in warnings:
        total -= deductions.get(w["severity"], 0)
    return max(0, total)