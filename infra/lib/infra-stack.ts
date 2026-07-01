import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const analyzerFn = new lambda.Function(this, "SqlAnalyzerFunction", {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "handler.lambda_handler",
      code: lambda.Code.fromAsset("../backend", {
        bundling: {
          image: lambda.Runtime.PYTHON_3_11.bundlingImage,
          command: [
            "bash",
            "-c",
            "pip install -r requirements_lambda.txt -t /asset-output && cp -r . /asset-output",
          ],
        },
      }),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const api = new apigw.RestApi(this, "SqlAnalyzerApi", {
      restApiName: "SQL Analyzer API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    const analyze = api.root.addResource("analyze");
    analyze.addMethod("POST", new apigw.LambdaIntegration(analyzerFn));

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    });
  }
}
