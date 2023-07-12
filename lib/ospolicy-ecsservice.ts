import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";

const vpc = new ec2.Vpc(this, "ECSVpc", {
    maxAzs: 3
}); 

const cluster = new ecs.Cluster(this, "MyCluster", {
    vpc: vpc
  });

  // Create a load-balanced Fargate service and make it public
  new ecs_patterns.ApplicationLoadBalancedFargateService(this, "GoatService", {
    cluster: cluster, // Required
    cpu: 512, // Default is 256
    desiredCount: 6, // Default is 1
    taskImageOptions: { image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample") },
    memoryLimitMiB: 2048, // Default is 512
    publicLoadBalancer: true // Default is true
  });