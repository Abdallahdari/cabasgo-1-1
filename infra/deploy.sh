#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Build, push and roll out Codka Bulshada to ECS Fargate.
#
#   ENV_NAME=staging AWS_REGION=eu-west-1 STACK_PARAMS=infra/params/staging.json ./infra/deploy.sh
#
# Prerequisites (see docs/DEPLOYMENT.md):
#   - AWS CLI v2 authenticated (e.g. `aws sso login --profile codka-deploy`)
#   - ECR stack deployed (infra/cloudformation/ecr.yaml)
#   - STACK_PARAMS file with the parameters of infra/cloudformation/codka-bulshada.yaml
#     (ImageUri / ToolsImageUri are filled in by this script)
#   - Docker with buildx
# The script never prints secrets. It stops on the first error.
# -----------------------------------------------------------------------------
set -euo pipefail

: "${ENV_NAME:?ENV_NAME must be staging or production}"
: "${AWS_REGION:?AWS_REGION is required}"
: "${STACK_PARAMS:?STACK_PARAMS (path to parameters JSON) is required}"

STACK_NAME="codka-bulshada-${ENV_NAME}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
TAG="$(git rev-parse --short=12 HEAD)$(git diff --quiet || echo -dirty)"
APP_IMAGE="${REGISTRY}/codka-bulshada:${TAG}"
TOOLS_IMAGE="${REGISTRY}/codka-bulshada-tools:${TAG}"

if [[ "$TAG" == *-dirty && "$ENV_NAME" == "production" ]]; then
  echo "Refusing to deploy uncommitted changes to production." >&2
  exit 1
fi

echo "==> Verifying the build (lint, types, tests)"
npm run lint
npm run typecheck
npm test

echo "==> Logging in to ECR ${REGISTRY}"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Building and pushing ${APP_IMAGE}"
docker buildx build --platform linux/amd64 --target runner -t "$APP_IMAGE" --push .
echo "==> Building and pushing ${TOOLS_IMAGE}"
docker buildx build --platform linux/amd64 --target tools -t "$TOOLS_IMAGE" --push .

echo "==> Deploying CloudFormation stack ${STACK_NAME}"
PARAMS=$(node -e '
  const p = require(process.argv[1]);
  const out = Object.entries({ ...p, ImageUri: process.argv[2], ToolsImageUri: process.argv[3] })
    .map(([k, v]) => `${k}=${v}`);
  console.log(out.join("\n"));
' "$(realpath "$STACK_PARAMS")" "$APP_IMAGE" "$TOOLS_IMAGE")
mapfile -t PARAM_ARGS <<< "$PARAMS"

aws cloudformation deploy \
  --region "$AWS_REGION" \
  --stack-name "$STACK_NAME" \
  --template-file infra/cloudformation/codka-bulshada.yaml \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides "${PARAM_ARGS[@]}"

output() {
  aws cloudformation describe-stacks --region "$AWS_REGION" --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
CLUSTER="$(output ClusterName)"
TOOLS_TD="$(output ToolsTaskDefinitionArn)"
SG="$(output AppSecurityGroupId)"
SUBNETS="$(node -e 'console.log(require(process.argv[1]).PrivateSubnetIds)' "$(realpath "$STACK_PARAMS")")"

echo "==> Syncing MongoDB indexes (one-off Fargate task)"
TASK_ARN=$(aws ecs run-task --region "$AWS_REGION" --cluster "$CLUSTER" --launch-type FARGATE \
  --task-definition "$TOOLS_TD" \
  --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS}],securityGroups=[${SG}],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"tools","command":["sh","-c","npm run db:indexes && npm run db:seed"]}]}' \
  --query 'tasks[0].taskArn' --output text)
aws ecs wait tasks-stopped --region "$AWS_REGION" --cluster "$CLUSTER" --tasks "$TASK_ARN"
EXIT_CODE=$(aws ecs describe-tasks --region "$AWS_REGION" --cluster "$CLUSTER" --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode' --output text)
if [[ "$EXIT_CODE" != "0" ]]; then
  echo "Index/seed task failed (exit ${EXIT_CODE}). Check CloudWatch log group $(output LogGroupName)." >&2
  exit 1
fi

echo "==> Waiting for the ECS service to become stable"
aws ecs wait services-stable --region "$AWS_REGION" --cluster "$CLUSTER" --services "$(output ServiceName)"

echo "==> Smoke test"
URL="$(output SiteUrl)"
curl --fail --silent --show-error "${URL}/api/health"
echo
echo "Deployed ${TAG} to ${URL}"
