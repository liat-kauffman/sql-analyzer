import sqlglot
import sqlglot.expressions as exp

def lint(sql: str) -> list[dict]:
    warnings = []
    try:
        tree = sqlglot.parse_one(sql)
    except Exception:
        warnings.append({
            "type": "parse_error",
            "severity": "warning",
            "message": "Could not parse this SQL — it may contain syntax errors."
        })
        return warnings

    # 1. SELECT *
    for _ in tree.find_all(exp.Star):
        warnings.append({
            "type": "select_star",
            "severity": "warning",
            "message": "Avoid SELECT * — specify only the columns you need to reduce data transfer and prevent breakage if the schema changes."
        })
        break

    # 2. Missing WHERE on SELECT
    if isinstance(tree, exp.Select) and not tree.find(exp.Where):
        warnings.append({
            "type": "missing_where",
            "severity": "info",
            "message": "No WHERE clause — this query will scan the entire table."
        })

    # 3. Subquery in WHERE
    for subquery in tree.find_all(exp.Subquery):
        parent = subquery.parent
        if isinstance(parent, (exp.In, exp.Where)):
            warnings.append({
                "type": "subquery_in_where",
                "severity": "warning",
                "message": "Subquery in WHERE detected — consider rewriting as a JOIN for better performance."
            })
            break

    # 4. Missing LIMIT on SELECT
    if isinstance(tree, exp.Select) and not tree.find(exp.Limit):
        warnings.append({
            "type": "missing_limit",
            "severity": "info",
            "message": "No LIMIT clause — on large tables this could return millions of rows."
        })

    # 5. HAVING without WHERE (filter before aggregation when possible)
    if tree.find(exp.Having) and not tree.find(exp.Where):
        warnings.append({
            "type": "having_without_where",
            "severity": "info",
            "message": "HAVING is used without WHERE — if possible, filter rows with WHERE before aggregation to improve performance."
        })
    

    # 6. LIKE with leading wildcard
    for like in tree.find_all(exp.Like):
        pattern = like.args.get("expression")
        if pattern and str(pattern).startswith("'%"):
            warnings.append({
                "type": "leading_wildcard",
                "severity": "warning",
                "message": "LIKE with a leading wildcard (LIKE '%...') can't use indexes and will cause a full table scan."
            })
            break

    # 7. SELECT * with JOIN
    has_star = bool(tree.find(exp.Star))
    has_join = bool(list(tree.find_all(exp.Join)))
    if has_star and has_join:
        warnings.append({
            "type": "select_star_with_join",
            "severity": "warning",
            "message": "SELECT * with JOIN returns all columns from all joined tables — be explicit about which columns you need."
        })

    # 8. OR in WHERE (can prevent index usage)
    where = tree.find(exp.Where)
    if where and where.find(exp.Or):
        warnings.append({
            "type": "or_in_where",
            "severity": "info",
            "message": "OR in WHERE can prevent index usage — consider rewriting with UNION ALL if performance is critical."
        })

    # 9. NOT IN with subquery (use NOT EXISTS instead)
    for not_in in tree.find_all(exp.Not):
        if not_in.find(exp.In):
            warnings.append({
                "type": "not_in_subquery",
                "severity": "warning",
                "message": "NOT IN with a subquery can behave unexpectedly with NULL values — consider using NOT EXISTS instead."
            })
            break

    # 10. Cartesian join (JOIN without ON)
    for join in tree.find_all(exp.Join):
        if not join.args.get("on") and not join.args.get("using"):
            warnings.append({
                "type": "cartesian_join",
                "severity": "warning",
                "message": "JOIN without an ON clause produces a cartesian product — every row joined with every other row. Add an ON condition."
            })
            break

    # 11. DELETE without WHERE
    if isinstance(tree, exp.Delete) and not tree.find(exp.Where):
        warnings.append({
            "type": "delete_without_where",
            "severity": "warning",
            "message": "DELETE without WHERE will delete all rows in the table. Add a WHERE clause unless you intend to truncate the table."
        })

    # 12. UPDATE without WHERE
    if isinstance(tree, exp.Update) and not tree.find(exp.Where):
        warnings.append({
            "type": "update_without_where",
            "severity": "warning",
            "message": "UPDATE without WHERE will update every row in the table. Add a WHERE clause to target specific rows."
        })

    # 13. DISTINCT with GROUP BY (redundant)
    if tree.find(exp.Distinct) and tree.find(exp.Group):
        warnings.append({
            "type": "distinct_with_group_by",
            "severity": "info",
            "message": "DISTINCT with GROUP BY is usually redundant — GROUP BY already returns unique groupings."
        })

    # 14. ORDER BY without LIMIT (expensive on large tables)
    if tree.find(exp.Order) and not tree.find(exp.Limit):
        warnings.append({
            "type": "order_without_limit",
            "severity": "info",
            "message": "ORDER BY without LIMIT sorts the entire result set — add LIMIT if you only need the top N rows."
        })

    # 15. Function on column in WHERE (prevents index usage)
    if where:
        for func in where.find_all(exp.Anonymous, exp.Upper, exp.Lower, exp.Coalesce, exp.Cast):
            if func.find(exp.Column):
                warnings.append({
                    "type": "function_on_column_in_where",
                    "severity": "warning",
                    "message": "Applying a function to a column in WHERE (e.g. UPPER(name) = ...) prevents index usage — consider storing data in a consistent format instead."
                })
                break
 # 16. HAVING references SELECT alias (may not be supported in all DBs)
    having = tree.find(exp.Having)
    if having:
        # collect aliases defined in SELECT
        select_aliases = set()
        for alias in tree.find_all(exp.Alias):
            if alias.args.get("alias"):
                select_aliases.add(str(alias.args["alias"]).lower())

        # check if HAVING references any of those aliases
        for col in having.find_all(exp.Column):
            col_name = col.args.get("this")
            if col_name and str(col_name).lower() in select_aliases:
                warnings.append({
                    "type": "having_uses_select_alias",
                    "severity": "warning",
                    "message": f"HAVING references '{col_name}', which is a SELECT alias. This works in MySQL but fails in PostgreSQL and standard SQL — use the full expression instead (e.g. HAVING SUM(total_amount) > 500)."
                })
                break
            
    return warnings


def score(warnings: list[dict]) -> int:
    deductions = {"warning": 15, "info": 5}
    total = 100
    for w in warnings:
        total -= deductions.get(w["severity"], 0)
    return max(0, total) 