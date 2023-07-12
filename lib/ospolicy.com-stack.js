"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OspolicyComStack = void 0;
const cdk = require("aws-cdk-lib");
const route53 = require("aws-cdk-lib/aws-route53");
const s3 = require("aws-cdk-lib/aws-s3");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
const cloudfront = require("aws-cdk-lib/aws-cloudfront");
const aws_cloudfront_1 = require("aws-cdk-lib/aws-cloudfront");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const route53Targets = require("aws-cdk-lib/aws-route53-targets");
const origins = require("aws-cdk-lib/aws-cloudfront-origins");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const ecs_patterns = require("aws-cdk-lib/aws-ecs-patterns");
class OspolicyComStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // create variables
        const domainName = 'www.ospolicy.com';
        //Tag the stack
        aws_cdk_lib_1.Tags.of(this).add('Project', 'ospolicy.com');
        aws_cdk_lib_1.Tags.of(this).add('Owner', 'Paul Pottorff');
        // create zone record
        const zone = route53.HostedZone.fromLookup(this, 'HostedZone', { domainName: domainName });
        //create cookie properties
        const cookieProps = {
            cookieName: 'ospolicy.com',
            ttl: aws_cdk_lib_1.Duration.days(0),
            secure: true,
            httpOnly: true,
            sameSite: 'None',
        };
        // create certificate
        const certificate = new acm.DnsValidatedCertificate(this, 'ospolicySiteCertificate', {
            domainName: domainName,
            hostedZone: zone,
            region: 'us-east-1',
        });
        // create s3 bucket for CloudFront and put to OAI
        const assetsBucket = new s3.Bucket(this, 'ospolicy-StaticAssets-bucket', {
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: true
        });
        const cloudfrontOriginAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'CloudFrontOriginAccessIdentity');
        assetsBucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [assetsBucket.arnForObjects('*')],
            principals: [new iam.CanonicalUserPrincipal(cloudfrontOriginAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
        }));
        // Add a function to the cloudfront distribution
        const rewriteFunction = new cloudfront.Function(this, 'Function', {
            code: cloudfront.FunctionCode.fromFile({ filePath: 'functions/url-rewrite.js' }),
        });
        // configure header policies
        const responseHeaderPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersResponseHeaderPolicy', {
            comment: 'Security headers response header policy',
            securityHeadersBehavior: {
                contentSecurityPolicy: {
                    override: true,
                    contentSecurityPolicy: "default-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'none'; base-uri 'self'; manifest-src 'self'",
                },
                strictTransportSecurity: {
                    override: true,
                    accessControlMaxAge: aws_cdk_lib_1.Duration.days(2 * 365),
                    includeSubdomains: true,
                    preload: true
                },
                contentTypeOptions: {
                    override: true
                },
                referrerPolicy: {
                    override: true,
                    referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN
                },
                xssProtection: {
                    override: true,
                    protection: true,
                    modeBlock: true
                },
                frameOptions: {
                    override: true,
                    frameOption: cloudfront.HeadersFrameOption.DENY
                }
            }
        });
        // create cloudfront distribution
        const cloudfrontDistribution = new cloudfront.Distribution(this, 'CloudFrontDistribution', {
            certificate: certificate,
            domainNames: [domainName],
            enableLogging: true,
            logBucket: new s3.Bucket(this, 'CloudFrontLogBucket', {
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                publicReadAccess: false,
                removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
                autoDeleteObjects: true,
                encryption: s3.BucketEncryption.S3_MANAGED,
            }),
            logFilePrefix: 'cloudfront',
            logIncludesCookies: true,
            defaultRootObject: 'index.html',
            defaultBehavior: {
                origin: new origins.S3Origin(assetsBucket, {
                    originAccessIdentity: cloudfrontOriginAccessIdentity
                }),
                functionAssociations: [{
                        function: rewriteFunction,
                        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST
                    }],
                viewerProtocolPolicy: aws_cloudfront_1.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                responseHeadersPolicy: responseHeaderPolicy
            },
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                    ttl: aws_cdk_lib_1.Duration.seconds(0),
                },
            ],
        });
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3deploy.Source.asset('./site-contents')],
            destinationBucket: assetsBucket,
            distribution: cloudfrontDistribution,
            distributionPaths: ['/*']
        });
        // create route53 record for the website
        new route53.ARecord(this, 'ARecord', {
            recordName: domainName,
            target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(cloudfrontDistribution)),
            zone
        });
        //create ecs fargate cluster from ecs_patterns
        const vpc = new ec2.Vpc(this, "ECSVpc", {
            maxAzs: 3
        });
        const cluster = new ecs.Cluster(this, "MyCluster", {
            vpc: vpc
        });
        // Create a load-balanced Fargate service and make it public
        new ecs_patterns.ApplicationLoadBalancedFargateService(this, "GoatService", {
            cluster: cluster,
            cpu: 512,
            desiredCount: 6,
            taskImageOptions: { image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample") },
            memoryLimitMiB: 2048,
            publicLoadBalancer: true // Default is true
        });
    }
}
exports.OspolicyComStack = OspolicyComStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3Nwb2xpY3kuY29tLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsib3Nwb2xpY3kuY29tLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQyxtREFBbUQ7QUFDbkQseUNBQXlDO0FBQ3pDLDZDQUE0RDtBQUM1RCwyQ0FBMkM7QUFDM0MseURBQXlEO0FBQ3pELCtEQUFrRTtBQUNsRSwwREFBMEQ7QUFDMUQsMERBQTBEO0FBQzFELGtFQUFrRTtBQUNsRSw4REFBOEQ7QUFDOUQsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyw2REFBNkQ7QUFHN0QsTUFBYSxnQkFBaUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM3QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLG1CQUFtQjtRQUNuQixNQUFNLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQztRQUV0QyxlQUFlO1FBQ2Ysa0JBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUM3QyxrQkFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRTVDLHFCQUFxQjtRQUNyQixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFFM0YsMEJBQTBCO1FBQzFCLE1BQU0sV0FBVyxHQUFHO1lBQ2xCLFVBQVUsRUFBRSxjQUFjO1lBQzFCLEdBQUcsRUFBRSxzQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDckIsTUFBTSxFQUFFLElBQUk7WUFDWixRQUFRLEVBQUUsSUFB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SCx3Q0FBd0M7UUFDeEMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDbkMsVUFBVSxFQUFFLFVBQVU7WUFDdEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksY0FBYyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDbkcsSUFBSTtTQUNMLENBQUMsQ0FBQztRQUVILDhDQUE4QztRQUU5QyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUN0QyxNQUFNLEVBQUUsQ0FBQztTQUNWLENBQUMsQ0FBQztRQUVILE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ2pELEdBQUcsRUFBRSxHQUFHO1NBQ1QsQ0FBQyxDQUFDO1FBRUgsNERBQTREO1FBQzVELElBQUksWUFBWSxDQUFDLHFDQUFxQyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDMUUsT0FBTyxFQUFFLE9BQU87WUFDaEIsR0FBRyxFQUFFLEdBQUc7WUFDUixZQUFZLEVBQUUsQ0FBQztZQUNmLGdCQUFnQixFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLEVBQUU7WUFDeEYsY0FBYyxFQUFFLElBQUk7WUFDcEIsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLGtCQUFrQjtTQUM1QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUExSkQsNENBMEpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0IHsgRHVyYXRpb24sIFJlbW92YWxQb2xpY3ksIFRhZ3MgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCB7IFZpZXdlclByb3RvY29sUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnO1xuaW1wb3J0ICogYXMgcm91dGU1M1RhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1lY3NcIjtcbmltcG9ydCAqIGFzIGVjc19wYXR0ZXJucyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVjcy1wYXR0ZXJuc1wiO1xuXG5cbmV4cG9ydCBjbGFzcyBPc3BvbGljeUNvbVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gY3JlYXRlIHZhcmlhYmxlc1xuICAgIGNvbnN0IGRvbWFpbk5hbWUgPSAnd3d3Lm9zcG9saWN5LmNvbSc7XG5cbiAgICAvL1RhZyB0aGUgc3RhY2tcbiAgICBUYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsICdvc3BvbGljeS5jb20nKTtcbiAgICBUYWdzLm9mKHRoaXMpLmFkZCgnT3duZXInLCAnUGF1bCBQb3R0b3JmZicpO1xuXG4gICAgLy8gY3JlYXRlIHpvbmUgcmVjb3JkXG4gICAgY29uc3Qgem9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tTG9va3VwKHRoaXMsICdIb3N0ZWRab25lJywgeyBkb21haW5OYW1lOiBkb21haW5OYW1lIH0pO1xuXG4gICAgLy9jcmVhdGUgY29va2llIHByb3BlcnRpZXNcbiAgICBjb25zdCBjb29raWVQcm9wcyA9IHtcbiAgICAgIGNvb2tpZU5hbWU6ICdvc3BvbGljeS5jb20nLFxuICAgICAgdHRsOiBEdXJhdGlvbi5kYXlzKDApLFxuICAgICAgc2VjdXJlOiB0cnVlLFxuICAgICAgaHR0cE9ubHk6IHRydWUsXG4gICAgICBzYW1lU2l0ZTogJ05vbmUnLFxuICAgIH07XG4gICAgLy8gY3JlYXRlIGNlcnRpZmljYXRlXG4gICAgY29uc3QgY2VydGlmaWNhdGUgPSBuZXcgYWNtLkRuc1ZhbGlkYXRlZENlcnRpZmljYXRlKHRoaXMsICdvc3BvbGljeVNpdGVDZXJ0aWZpY2F0ZScsXG4gICAgICB7XG4gICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICAgIGhvc3RlZFpvbmU6IHpvbmUsXG4gICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsIC8vIENsb3VkZnJvbnQgb25seSBjaGVja3MgdGhpcyByZWdpb24gZm9yIGNlcnRpZmljYXRlcy5cbiAgICAgIH0pO1xuXG4gICAgLy8gY3JlYXRlIHMzIGJ1Y2tldCBmb3IgQ2xvdWRGcm9udCBhbmQgcHV0IHRvIE9BSVxuICAgIGNvbnN0IGFzc2V0c0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ29zcG9saWN5LVN0YXRpY0Fzc2V0cy1idWNrZXQnLCB7XG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZVxuICAgIH0pO1xuICAgIFxuICAgIGNvbnN0IGNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eSA9IG5ldyBjbG91ZGZyb250Lk9yaWdpbkFjY2Vzc0lkZW50aXR5KHRoaXMsICdDbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHknKTtcblxuICAgIGFzc2V0c0J1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFsnczM6R2V0T2JqZWN0J10sXG4gICAgICByZXNvdXJjZXM6IFthc3NldHNCdWNrZXQuYXJuRm9yT2JqZWN0cygnKicpXSxcbiAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLkNhbm9uaWNhbFVzZXJQcmluY2lwYWwoY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5LmNsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eVMzQ2Fub25pY2FsVXNlcklkKV0sXG4gICAgfSkpO1xuXG4gICAgLy8gQWRkIGEgZnVuY3Rpb24gdG8gdGhlIGNsb3VkZnJvbnQgZGlzdHJpYnV0aW9uXG4gICAgY29uc3QgcmV3cml0ZUZ1bmN0aW9uID0gbmV3IGNsb3VkZnJvbnQuRnVuY3Rpb24odGhpcywgJ0Z1bmN0aW9uJywge1xuICAgICAgY29kZTogY2xvdWRmcm9udC5GdW5jdGlvbkNvZGUuZnJvbUZpbGUoeyBmaWxlUGF0aDogJ2Z1bmN0aW9ucy91cmwtcmV3cml0ZS5qcycgfSksXG4gICAgfSk7XG5cbiAgICAvLyBjb25maWd1cmUgaGVhZGVyIHBvbGljaWVzXG4gICAgY29uc3QgcmVzcG9uc2VIZWFkZXJQb2xpY3kgPSBuZXcgY2xvdWRmcm9udC5SZXNwb25zZUhlYWRlcnNQb2xpY3kodGhpcywgJ1NlY3VyaXR5SGVhZGVyc1Jlc3BvbnNlSGVhZGVyUG9saWN5Jywge1xuICAgICAgY29tbWVudDogJ1NlY3VyaXR5IGhlYWRlcnMgcmVzcG9uc2UgaGVhZGVyIHBvbGljeScsXG4gICAgICBzZWN1cml0eUhlYWRlcnNCZWhhdmlvcjoge1xuICAgICAgICBjb250ZW50U2VjdXJpdHlQb2xpY3k6IHtcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcbiAgICAgICAgICBjb250ZW50U2VjdXJpdHlQb2xpY3k6IFwiZGVmYXVsdC1zcmMgJ3NlbGYnOyBpbWctc3JjICdzZWxmJzsgc2NyaXB0LXNyYyAnc2VsZic7IHN0eWxlLXNyYyAnc2VsZic7IGZvbnQtc3JjICdzZWxmJzsgY29ubmVjdC1zcmMgJ3NlbGYnOyBmcmFtZS1hbmNlc3RvcnMgJ25vbmUnOyBmb3JtLWFjdGlvbiAnbm9uZSc7IGJhc2UtdXJpICdzZWxmJzsgbWFuaWZlc3Qtc3JjICdzZWxmJ1wiLFxuICAgICAgICB9LFxuICAgICAgICBzdHJpY3RUcmFuc3BvcnRTZWN1cml0eToge1xuICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxuICAgICAgICAgIGFjY2Vzc0NvbnRyb2xNYXhBZ2U6IER1cmF0aW9uLmRheXMoMiAqIDM2NSksXG4gICAgICAgICAgaW5jbHVkZVN1YmRvbWFpbnM6IHRydWUsXG4gICAgICAgICAgcHJlbG9hZDogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBjb250ZW50VHlwZU9wdGlvbnM6IHtcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICByZWZlcnJlclBvbGljeToge1xuICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxuICAgICAgICAgIHJlZmVycmVyUG9saWN5OiBjbG91ZGZyb250LkhlYWRlcnNSZWZlcnJlclBvbGljeS5TVFJJQ1RfT1JJR0lOX1dIRU5fQ1JPU1NfT1JJR0lOXG4gICAgICAgIH0sXG4gICAgICAgIHhzc1Byb3RlY3Rpb246IHtcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcbiAgICAgICAgICBwcm90ZWN0aW9uOiB0cnVlLFxuICAgICAgICAgIG1vZGVCbG9jazogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBmcmFtZU9wdGlvbnM6IHtcbiAgICAgICAgICBvdmVycmlkZTogdHJ1ZSxcbiAgICAgICAgICBmcmFtZU9wdGlvbjogY2xvdWRmcm9udC5IZWFkZXJzRnJhbWVPcHRpb24uREVOWVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBjcmVhdGUgY2xvdWRmcm9udCBkaXN0cmlidXRpb25cbiAgICBjb25zdCBjbG91ZGZyb250RGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdDbG91ZEZyb250RGlzdHJpYnV0aW9uJywge1xuICAgICAgY2VydGlmaWNhdGU6IGNlcnRpZmljYXRlLFxuICAgICAgZG9tYWluTmFtZXM6IFtkb21haW5OYW1lXSxcbiAgICAgIGVuYWJsZUxvZ2dpbmc6IHRydWUsXG4gICAgICBsb2dCdWNrZXQ6IG5ldyBzMy5CdWNrZXQodGhpcywgJ0Nsb3VkRnJvbnRMb2dCdWNrZXQnLCB7XG4gICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksIFxuICAgICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgfSksXG4gICAgICBsb2dGaWxlUHJlZml4OiAnY2xvdWRmcm9udCcsXG4gICAgICBsb2dJbmNsdWRlc0Nvb2tpZXM6IHRydWUsXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4oYXNzZXRzQnVja2V0LCB7XG4gICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHk6IGNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eVxuICAgICAgICB9KSxcbiAgICAgICAgZnVuY3Rpb25Bc3NvY2lhdGlvbnM6IFt7XG4gICAgICAgICAgZnVuY3Rpb246IHJld3JpdGVGdW5jdGlvbixcbiAgICAgICAgICBldmVudFR5cGU6IGNsb3VkZnJvbnQuRnVuY3Rpb25FdmVudFR5cGUuVklFV0VSX1JFUVVFU1RcbiAgICAgICAgfV0sXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBWaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5OiByZXNwb25zZUhlYWRlclBvbGljeVxuICAgICAgfSxcbiAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICB0dGw6IER1cmF0aW9uLnNlY29uZHMoMCksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveVdlYnNpdGUnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KCcuL3NpdGUtY29udGVudHMnKV0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogYXNzZXRzQnVja2V0LFxuICAgICAgZGlzdHJpYnV0aW9uOiBjbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgZGlzdHJpYnV0aW9uUGF0aHM6IFsnLyonXVxuICAgIH0pO1xuXG4gICAgLy8gY3JlYXRlIHJvdXRlNTMgcmVjb3JkIGZvciB0aGUgd2Vic2l0ZVxuICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0FSZWNvcmQnLCB7XG4gICAgICByZWNvcmROYW1lOiBkb21haW5OYW1lLFxuICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMobmV3IHJvdXRlNTNUYXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQoY2xvdWRmcm9udERpc3RyaWJ1dGlvbikpLFxuICAgICAgem9uZVxuICAgIH0pO1xuXG4gICAgLy9jcmVhdGUgZWNzIGZhcmdhdGUgY2x1c3RlciBmcm9tIGVjc19wYXR0ZXJuc1xuICAgIFxuICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsIFwiRUNTVnBjXCIsIHtcbiAgICAgIG1heEF6czogM1xuICAgIH0pOyBcbiAgXG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBlY3MuQ2x1c3Rlcih0aGlzLCBcIk15Q2x1c3RlclwiLCB7XG4gICAgICB2cGM6IHZwY1xuICAgIH0pO1xuICBcbiAgICAvLyBDcmVhdGUgYSBsb2FkLWJhbGFuY2VkIEZhcmdhdGUgc2VydmljZSBhbmQgbWFrZSBpdCBwdWJsaWNcbiAgICBuZXcgZWNzX3BhdHRlcm5zLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VkRmFyZ2F0ZVNlcnZpY2UodGhpcywgXCJHb2F0U2VydmljZVwiLCB7XG4gICAgICBjbHVzdGVyOiBjbHVzdGVyLCAvLyBSZXF1aXJlZFxuICAgICAgY3B1OiA1MTIsIC8vIERlZmF1bHQgaXMgMjU2XG4gICAgICBkZXNpcmVkQ291bnQ6IDYsIC8vIERlZmF1bHQgaXMgMVxuICAgICAgdGFza0ltYWdlT3B0aW9uczogeyBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeShcImFtYXpvbi9hbWF6b24tZWNzLXNhbXBsZVwiKSB9LFxuICAgICAgbWVtb3J5TGltaXRNaUI6IDIwNDgsIC8vIERlZmF1bHQgaXMgNTEyXG4gICAgICBwdWJsaWNMb2FkQmFsYW5jZXI6IHRydWUgLy8gRGVmYXVsdCBpcyB0cnVlXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==