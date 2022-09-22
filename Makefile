SERVICE = cal
COMMIT_SHA = $(shell git rev-parse HEAD)
IMAGE = ${AWS_ECR_URL}/tourlane/${SERVICE}:${COMMIT_SHA}

SSM_STAGING = /${SERVICE}/staging

FUJI=docker run --rm -t \
		 -e AWS_DEFAULT_REGION="eu-west-1" \
		 -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
		 -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
		 ${AWS_ECR_URL}/fuji:2.0.1

.PHONY: docker_build
docker_build:
	docker build \
	       --network host \
	       --build-arg DATABASE_URL=${DATABASE_URL} \
	       --build-arg 'GOOGLE_API_CREDENTIALS=${GOOGLE_API_CREDENTIALS}' \
	       --build-arg NEXT_PUBLIC_WEBAPP_URL=${NEXT_PUBLIC_WEBAPP_URL} \
	       -t ${IMAGE} .

.PHONY: docker_push
docker_push:
	docker push ${IMAGE}

.PHONY: deploy_to_staging
deploy_to_staging:
	@echo "\033[94m## Deploying ${COMMIT_SHA} to staging \033[0m"
	@${FUJI} deploy \
		--service ${SERVICE} \
		--branch staging \
		--cluster staging \
		--environment NEXT_PUBLIC_WEBAPP_URL=${NEXT_PUBLIC_WEBAPP_URL} \
		--secrets DATABASE_URL=${SSM_STAGING}/DATABASE_URL,NEXTAUTH_SECRET=${SSM_STAGING}/NEXTAUTH_SECRET,CALENDSO_ENCRYPTION_KEY=${SSM_STAGING}/CALENDSO_ENCRYPTION_KEY,GOOGLE_API_CREDENTIALS=${SSM_STAGING}/GOOGLE_API_CREDENTIALS \
		--image ${IMAGE} \
		--command "sh /calcom/scripts/start.sh" \
		--desired-count "1" \
		--port "3000"

