import { App } from "aws-cdk-lib";
import { MisoSiteStack } from "../lib/miso-site-stack.ts";

const app = new App();
new MisoSiteStack(app, "MisoSite", {
  env: { account: "780465045392", region: "ap-northeast-1" },
  description: "手前味噌 — static site (S3 + CloudFront OAC)",
});
