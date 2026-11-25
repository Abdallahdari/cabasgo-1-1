// Deterministic test configuration. No real AWS credentials are used: S3 and
// SES clients are mocked with aws-sdk-client-mock, and presigning is local.
Object.assign(process.env, {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  MONGODB_DB_NAME: "codka_test",
  EMAIL_TRANSPORT: "console",
  AWS_REGION: "eu-west-1",
  S3_BUCKET: "codka-test-bucket",
  CLOUDFRONT_URL: "https://cdn.example.test",
  AWS_ACCESS_KEY_ID: "AKIATESTTESTTEST",
  AWS_SECRET_ACCESS_KEY: "test-secret-key-not-real",
  TRUSTED_PROXY_HOPS: "0",
});
