import json
from analyzer.explainer import explain
from analyzer.linter import lint, score

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        sql = body.get("sql", "").strip()

        if not sql:
            return _resp(400, {"error": "No SQL provided"})

        warnings = lint(sql)
        result = {
            "explanation": explain(sql),
            "warnings": warnings,
            "score": score(warnings),
        }
        return _resp(200, result)

    except Exception as e:
        return _resp(500, {"error": str(e)})

def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }

if __name__ == "__main__":
    test_sql = "SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers)"
    event = {"body": json.dumps({"sql": test_sql})}
    print(json.dumps(lambda_handler(event, None), indent=2))