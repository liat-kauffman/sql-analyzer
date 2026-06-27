import sqlglot

def parse_sql(sql: str):
    return sqlglot.parse_one(sql)