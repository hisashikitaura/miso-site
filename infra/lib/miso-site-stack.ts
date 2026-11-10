import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export class MisoSiteStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // "/admin" → "/admin/index.html", "/foo/" → "/foo/index.html"
    const rewrite = new cloudfront.Function(this, "IndexRewrite", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var r = event.request;
  var u = r.uri;
  if (u.endsWith('/')) r.uri = u + 'index.html';
  else if (!u.split('/').pop().includes('.')) r.uri = u + '/index.html';
  return r;
}`),
    });

    const headers = new cloudfront.ResponseHeadersPolicy(this, "Headers", {
      securityHeadersBehavior: {
        strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
      },
    });

    const dist = new cloudfront.Distribution(this, "Cdn", {
      comment: "miso-site",
      defaultRootObject: "index.html",
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: headers,
        functionAssociations: [{ function: rewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 404, responsePagePath: "/index.html", ttl: Duration.minutes(1) },
      ],
    });

    const distDir = join(here, "..", "..", "dist");
    // Hashed assets (dist/assets): long cache. HTML and the rest: short cache.
    new s3deploy.BucketDeployment(this, "DeployAssets", {
      sources: [s3deploy.Source.asset(join(distDir, "assets"))],
      destinationBucket: bucket,
      destinationKeyPrefix: "assets/",
      prune: false,
      cacheControl: [s3deploy.CacheControl.fromString("public, max-age=31536000, immutable")],
    });
    new s3deploy.BucketDeployment(this, "DeployHtml", {
      sources: [s3deploy.Source.asset(distDir, { exclude: ["assets", "assets/**"] })],
      destinationBucket: bucket,
      prune: false,
      cacheControl: [s3deploy.CacheControl.fromString("public, max-age=60")],
      distribution: dist,
      distributionPaths: ["/*"],
    });

    new CfnOutput(this, "SiteUrl", { value: `https://${dist.distributionDomainName}` });
    new CfnOutput(this, "AdminUrl", { value: `https://${dist.distributionDomainName}/admin` });
    new CfnOutput(this, "BucketName", { value: bucket.bucketName });
    new CfnOutput(this, "DistributionId", { value: dist.distributionId });
  }
}
