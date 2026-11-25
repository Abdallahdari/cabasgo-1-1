# Deploying Codka Bulshada to AWS

> **Status: not deployed.** Everything below has been prepared and linted. Nothing has been created in any AWS account, because credentials, the MongoDB Atlas cluster, the domain and SES verification are not available yet.

## Architecture

```
Browser ──HTTPS──▶ CloudFront (codka.example.org, ACM us-east-1, Route 53 alias)
                     ├── /_next/static/*   → ALB (cached)
                     ├── /complaints/*.*   → S3 media bucket (private, Origin Access Control)
                     └── everything else   → ALB (not cached), adds X-Origin-Verify header
ALB (HTTPS only, accepts only the CloudFront prefix list + secret header) ──▶ ECS Fargate service "web"
ECS tasks (private subnets, task IAM role) ──▶ MongoDB Atlas (secret from Secrets Manager)
                                           ──▶ S3 (presign/head/delete), SES (send)
Browser ──presigned POST──▶ S3 (CORS limited to the site origin; size limit enforced by policy)
EventBridge (hourly) ──▶ Fargate "tools" task: npm run jobs:cleanup-orphans
CloudWatch: JSON logs, alarms on 5xx, unhealthy hosts, CPU and app error logs → SNS email
```

Templates:

- `infra/cloudformation/ecr.yaml`: the ECR repositories (deploy once).
- `infra/cloudformation/codka-bulshada.yaml`: one stack per environment (`staging`, `production`).

Both pass `cfn-lint`.

## Environments

| | development | staging | production |
|---|---|---|---|
| `APP_ENV` | `development` | `staging` | `production` |
| Email | `console` (printed) | SES | SES |
| Storage | optional S3 / none | S3 + CloudFront | S3 + CloudFront |
| Database | local replica set or Atlas dev cluster | Atlas (separate DB/user) | Atlas (separate cluster/user) |

The app refuses to start in staging or production unless it has SES, an S3 bucket and an https `APP_URL` (`src/server/env.ts`).

## Prerequisites (one-time)

1. **AWS account access.** Set up an IAM Identity Center or deploy role that can manage CloudFormation, ECS, ECR, EC2/ELB, IAM roles, S3, CloudFront, Route 53, SES, Secrets Manager, CloudWatch and EventBridge.
2. **VPC.** You need two public subnets for the ALB and two private subnets with a NAT gateway for the tasks.
3. **MongoDB Atlas.**
   - Create an M10+ cluster (replica set, so transactions are supported) in the same region.
   - Create a database user with `readWrite` on the app database only.
   - Restrict network access to the NAT gateway EIPs, or use VPC peering or PrivateLink.
4. **Secrets Manager.** Store the connection string as a plain-text secret, for example `codka/production/mongodb-uri`.
5. **Domain.**
   - Create or choose a Route 53 hosted zone.
   - Request an ACM certificate in **us-east-1** for the site domain (CloudFront).
   - Request an ACM certificate in the app region for the origin hostname (ALB), e.g. `origin.codka.example.org`.
6. **CloudFront prefix list.** Find the region's managed prefix list ID:
   `aws ec2 describe-managed-prefix-lists --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing`.
7. **SES.**
   - The stack creates the domain identity and its DKIM records.
   - Afterwards, request **production access** (to leave the SES sandbox) for the region.
   - Until production access is granted, SES only delivers to verified addresses.
8. **Origin secret.** Generate one: `openssl rand -hex 32`. Keep it out of git.

## First deployment

```bash
# 1. ECR repositories
aws cloudformation deploy --stack-name codka-bulshada-ecr \
  --template-file infra/cloudformation/ecr.yaml

# 2. Parameters: copy and fill in (do not commit the filled file)
cp infra/params/staging.example.json infra/params/staging.json

# 3. Build, push, deploy, sync indexes + seed, wait for a stable service, smoke test
ENV_NAME=staging AWS_REGION=eu-west-1 STACK_PARAMS=infra/params/staging.json ./infra/deploy.sh

# 4. Bootstrap the first administrator (one-off task; the password is printed in its log once)
aws ecs run-task --cluster codka-bulshada-staging --launch-type FARGATE \
  --task-definition codka-bulshada-tools-staging \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-…],securityGroups=[sg-…],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"tools","command":["npm","run","admin:create","--","--email","admin@example.org","--name","Maamule"]}]}'
```

After the admin is created, delete the CloudWatch log stream that contains the generated password. Alternatively, pass `ADMIN_PASSWORD` as a container override secret.

## Subsequent deployments

Run `./infra/deploy.sh` again. It will:

1. Lint, type-check and test the code.
2. Build and push immutable, SHA-tagged images (`runner` and `tools` targets).
3. Update the stack.
4. Run the index/seed task.
5. Wait for the ECS rolling deployment. The circuit breaker rolls back automatically on failed health checks.
6. Smoke-test `/api/health`.

Production deploys refuse uncommitted changes.

## Operations

| Area | Details |
|---|---|
| Logs | CloudWatch log group `/ecs/codka-bulshada-<env>`, JSON lines. In Logs Insights: `fields @timestamp, level, msg, error.message \| filter level = "error"`. |
| Health | `GET /api/health` returns 200 only when MongoDB answers a ping. It is used by the ALB and by the container health check. |
| Scaling | Target tracking at 60% CPU, from `DesiredCount` up to 10 tasks. |
| Orphaned uploads | Hourly scheduled task. Run it manually with the same `run-task` command and `npm run jobs:cleanup-orphans`. |
| Indexes | `npm run db:indexes` (Mongoose `syncIndexes`). `autoIndex` is disabled outside development. |
| Rotating the Mongo password | Update the secret, then force a new deployment: `aws ecs update-service --force-new-deployment …`. |
