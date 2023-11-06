import * as aws from "@pulumi/aws";
import type { LogGroup } from "@pulumi/aws/cloudwatch";
import type { SecurityGroup } from "@pulumi/aws/ec2";
import * as awsx from "@pulumi/awsx";
import type { Cluster } from "@pulumi/awsx/classic/ecs/cluster";
import type { Vpc } from "@pulumi/awsx/ec2/vpc";
import type { Image, Repository } from "@pulumi/awsx/ecr";
import type { FargateService } from "@pulumi/awsx/ecs";
import type { ApplicationLoadBalancer } from "@pulumi/awsx/lb";
import * as pulumi from "@pulumi/pulumi";

type SecretType = { name: string; valueFrom: string };

const awsConfig = new pulumi.Config("aws");
const baseConfig = new pulumi.Config("base");
const awsRegion = awsConfig.require("region");
const certificateArn = baseConfig.require("certificateArn");
const url = baseConfig.require("url");

console.log("REGION", awsRegion, url, certificateArn);
if (!awsRegion) {
  throw new Error("AWS REGION IS NOT SET");
}

const SECRETS = [
  "API_KEY_PREFIX",
  "CALCOM_LICENSE_KEY",
  "DATABASE_URL",
  "DATABASE_URL_BACKUP",
  "GITHUB_ACCESS_TOKEN",
  "NEXT_PUBLIC_WEBAPP_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "CALENDSO_ENCRYPTION_KEY",
  "EMAIL_FROM",
  "EMAIL_SERVER",
  "GOOGLE_API_CREDENTIALS",
  "GOOGLE_LOGIN_ENABLED",
  "NEXT_PUBLIC_SENDGRID_SENDER_NAME",
  "NEXT_PUBLIC_STRIPE_PUBLIC_KEY",
  "NEXT_PUBLIC_WEBSITE_URL",
  "NEXTAUTH_COOKIE_DOMAIN",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "SENDGRID_API_KEY",
  "SENDGRID_EMAIL",
  "STRIPE_CLIENT_ID",
  "STRIPE_PRIVATE_KEY",
  "TWILIO_MESSAGING_SID",
  "TWILIO_PHONE_NUMBER",
  "TWILIO_SID",
  "TWILIO_TOKEN",
  "TWILIO_VERIFY_SID",
  "YARN_ENABLE_IMMUTABLE_INSTALLS",
].map((secretKey) => {
  if (process.env.NODE_ENV === "development") {
    return `DEV_${secretKey}`;
  }
  return secretKey;
});

// Get Secrets
const getAwsSecrets = async () => {
  const res = [];
  for (let index = 0; index < SECRETS.length; index++) {
    try {
      const secretKey = SECRETS[index];
      const secret = await aws.secretsmanager.getSecret({ name: secretKey });
      if (secret && secret.arn) res.push({ name: secretKey, valueFrom: secret.arn });
    } catch (err) {
      console.info("Secret not found:", SECRETS[index]);
    }
  }
  return res;
};

const createVpc = (name: string) => {
  // Create VPC
  const vpc = new awsx.ec2.Vpc(name, {
    cidrBlock: "10.0.0.0/16",
  });
  return vpc;
};

const createHttpsSecurityGroup = (name: string, vpcId: Vpc["vpcId"]) => {
  // Create Security Group
  const sg = new aws.ec2.SecurityGroup(name, {
    vpcId: vpcId,
    ingress: [
      {
        description: "allow HTTP access from anywhere",
        fromPort: 80,
        toPort: 80,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"],
      },
      {
        description: "allow HTTPS access from anywhere",
        fromPort: 443,
        toPort: 443,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    egress: [
      {
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
  });
  return sg;
};

const createLog = () => {
  // Create Cloudwatch LogGroup and Stream
  const logGroup = new aws.cloudwatch.LogGroup("cal-api-log-group");
  const logStream = new aws.cloudwatch.LogStream("cal-api-log-stream", {
    logGroupName: logGroup.name,
  });
  return { logGroup, logStream };
};

const createAppLoadBalancer = (
  name: string,
  publicSubnetIds: Vpc["publicSubnetIds"],
  securityGroupId: SecurityGroup["id"]
) => {
  // Create Application Load Balancer
  const lb = new awsx.lb.ApplicationLoadBalancer(name, {
    securityGroups: [securityGroupId],
    subnetIds: publicSubnetIds,
    defaultTargetGroup: { healthCheck: { matcher: "200-299" }, port: 80, protocol: "HTTP" },
    listeners: [
      {
        port: 80,
        protocol: "HTTP",
        defaultActions: [
          {
            type: "redirect",
            redirect: {
              protocol: "HTTPS",
              port: "443",
              statusCode: "HTTP_301",
            },
          },
        ],
      },
      {
        port: 443,
        protocol: "HTTPS",
        certificateArn: certificateArn,
      },
    ],
  });
  return lb;
};

const createDockerImagesRepo = (name: string) => {
  // Create ECR Image Repository
  const repository = new awsx.ecr.Repository(name, {});
  return repository;
};

const createDockerImage = ({
  imageName,
  repoUrl,
  dockerFilePath,
  buildContextPath,
}: {
  imageName: string;
  repoUrl: Repository["url"];
  dockerFilePath: string;
  buildContextPath: string;
}) => {
  // Create Docker Image of Api and Store in Repo
  const image = new awsx.ecr.Image(imageName, {
    repositoryUrl: repoUrl,
    dockerfile: dockerFilePath,
    path: buildContextPath,
  });
  return image;
};

const createElasticContainerCluster = (clusterName: string) => {
  // Create ECS cluster
  const cluster = new awsx.classic.ecs.Cluster(clusterName, {});
  return cluster;
};

const createFargateServiceWithSecrets = ({
  secrets,
  imageUri,
  logGroupName,
  loadBalancerTargetGroup,
  ecsClusterArn,
  privateSubnetIds,
  securityGroupId,
  serviceName,
}: {
  secrets: SecretType[];
  imageUri: Image["imageUri"];
  logGroupName: LogGroup["name"];
  loadBalancerTargetGroup: ApplicationLoadBalancer["defaultTargetGroup"];
  ecsClusterArn: Cluster["cluster"]["arn"];
  privateSubnetIds: Vpc["privateSubnetIds"];
  securityGroupId: SecurityGroup["id"];
  serviceName: string;
}) => {
  // Policy For Secrets
  const secretsManagerAccessPolicy = new aws.iam.Policy("fargate-secrets-policy", {
    policy: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "secretsmanager:GetSecretValue",
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: [
            "ecr:GetAuthorizationToken",
            "ecr:BatchCheckLayerAvailability",
            "ecr:GetDownloadUrlForLayer",
            "ecr:BatchGetImage",
            "logs:CreateLogStream",
            "logs:PutLogEvents",
          ],
          Resource: "*",
        },
      ],
    },
  });

  // IAM Role To Attach To Fargate Service for Accessing Secrets
  const taskRole = new aws.iam.Role("task-exec-role", {
    assumeRolePolicy: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Principal: {
            Service: "ecs-tasks.amazonaws.com",
          },
          Effect: "Allow",
        },
      ],
    },
  });

  // Attach Policy and Role
  new aws.iam.RolePolicyAttachment("task-exec-policy-attach", {
    role: taskRole,
    policyArn: secretsManagerAccessPolicy.arn,
  });

  // Create Fargate Service
  const service = new awsx.ecs.FargateService("service", {
    cluster: ecsClusterArn,
    networkConfiguration: {
      subnets: privateSubnetIds,
      securityGroups: [securityGroupId],
      assignPublicIp: true,
    },

    desiredCount: 2,
    taskDefinitionArgs: {
      executionRole: { roleArn: taskRole.arn },
      logGroup: { skip: true },
      runtimePlatform: {
        cpuArchitecture: "ARM64",
      },
      container: {
        name: serviceName,
        image: imageUri,
        cpu: 1024,
        memory: 2000,
        essential: true,
        portMappings: [
          {
            containerPort: 80,
            hostPort: 80,
            targetGroup: loadBalancerTargetGroup,
          },
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": logGroupName,
            "awslogs-stream-prefix": "cal-api",
            "awslogs-region": `${awsRegion}`,
          },
        },
        secrets: secrets ?? [],
      },
    },
  });
  return service;
};

const createAutoScalingCpu = ({
  ecsClusterName,
  serviceName,
  cpuTargetValue,
  maxCapacity,
  minCapacity,
  scaleInCooldown,
  scaleOutCooldown,
}: {
  ecsClusterName: Cluster["cluster"]["name"];
  serviceName: FargateService["service"]["name"];
  cpuTargetValue: number;
  maxCapacity: number;
  minCapacity: number;
  scaleInCooldown: number;
  scaleOutCooldown: number;
}) => {
  // Create Autoscaling for the ECS service, Scale when CPU > 75%
  const autoscaling = new aws.appautoscaling.Policy("autoscaling", {
    serviceNamespace: "ecs",
    scalableDimension: "ecs:service:DesiredCount",
    resourceId: pulumi.interpolate`service/${ecsClusterName}/${serviceName}`,
    policyType: "TargetTrackingScaling",
    targetTrackingScalingPolicyConfiguration: {
      targetValue: cpuTargetValue,
      predefinedMetricSpecification: {
        predefinedMetricType: "ECSServiceAverageCPUUtilization",
      },
      scaleInCooldown,
      scaleOutCooldown,
    },
  });
  // Set Min and Max Number of Tasks
  const autoscalingTarget = new aws.appautoscaling.Target("my-scaling-target", {
    maxCapacity: maxCapacity, // maximum number of tasks
    minCapacity: minCapacity, // minimum number of tasks
    resourceId: pulumi.interpolate`service/${ecsClusterName}/${serviceName}`,
    scalableDimension: "ecs:service:DesiredCount",
    serviceNamespace: "ecs",
  });

  return { autoscaling, autoscalingTarget };
};

const main = async () => {
  const awsSecrets = await getAwsSecrets();
  const vpc = createVpc("cal-api-vpc");
  const httpsSg = createHttpsSecurityGroup("cal-api-sg", vpc.vpcId);
  const apiAlb = createAppLoadBalancer("cal-api-lb", vpc.publicSubnetIds, httpsSg.id);
  const { logGroup } = createLog();
  const repo = createDockerImagesRepo("cal-api-repo");
  const apiImage = createDockerImage({
    imageName: "cal-api-image",
    repoUrl: repo.url,
    dockerFilePath: "./api/Dockerfile",
    buildContextPath: "../",
  });
  const ecsCluster = createElasticContainerCluster("cal-api-cluster");
  const apiService = createFargateServiceWithSecrets({
    privateSubnetIds: vpc.privateSubnetIds,
    securityGroupId: httpsSg.id,
    secrets: awsSecrets,
    imageUri: apiImage.imageUri,
    logGroupName: logGroup.name,
    loadBalancerTargetGroup: apiAlb.defaultTargetGroup,
    ecsClusterArn: ecsCluster.cluster.arn,
    serviceName: process.env.NODE_ENV === "development" ? "cal-api-fargate-dev" : "cal-api-fargate",
  });
  const _ = createAutoScalingCpu({
    ecsClusterName: ecsCluster.cluster.name,
    serviceName: apiService.service.name,
    minCapacity: 1,
    maxCapacity: 5,
    cpuTargetValue: 75,
    scaleInCooldown: 60,
    scaleOutCooldown: 120,
  });
};

main();
