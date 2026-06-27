import sqlglot
import sqlglot.expressions as exp

def explain(sql: str) -> str:
    tree = sqlglot.parse_one(sql)
    parts = []

    if isinstance(tree, exp.Select):
        # What columns
        has_star = bool(tree.find(exp.Star))
        cols = "all columns" if has_star else "specific columns"

        # From which table
        from_clause = tree.find(exp.From)
        table_name = None
        if from_clause:
            table = from_clause.find(exp.Table)
            if table:
                table_name = table.name

        # Joins
        joins = list(tree.find_all(exp.Join))

        # Where
        where = tree.find(exp.Where)

        # Group by
        group = tree.find(exp.Group)

        # Order by
        order = tree.find(exp.Order)

        # Limit
        limit = tree.find(exp.Limit)

        # Build explanation
        base = f"Selects {cols}"
        if table_name:
            base += f" from the '{table_name}' table"
        parts.append(base)

        for join in joins:
            join_table = join.find(exp.Table)
            if join_table:
                parts.append(f"joined with '{join_table.name}'")

        if where:
            parts.append(f"filtered by: {where.this.sql()}")

        if group:
            parts.append(f"grouped by {group.sql().replace('GROUP BY ', '')}")

        if order:
            parts.append(f"ordered by {order.sql().replace('ORDER BY ', '')}")

        if limit:
            parts.append(f"limited to {limit.sql().replace('LIMIT ', '')} rows")

    elif isinstance(tree, exp.Insert):
        table = tree.find(exp.Table)
        parts.append(f"Inserts a new row into '{table.name if table else 'unknown'}'")

    elif isinstance(tree, exp.Update):
        table = tree.find(exp.Table)
        parts.append(f"Updates rows in '{table.name if table else 'unknown'}'")

    elif isinstance(tree, exp.Delete):
        table = tree.find(exp.Table)
        parts.append(f"Deletes rows from '{table.name if table else 'unknown'}'")

    else:
        parts.append("SQL statement detected but type could not be determined.")

    return ", ".join(parts) + "."