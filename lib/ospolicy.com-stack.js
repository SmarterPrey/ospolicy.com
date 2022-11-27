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
//import * as widget_service from "./widget_service";
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
                    contentSecurityPolicy: "default-src 'self'"
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
        // create widget service
        //new widget_service.WidgetService(this, 'WidgetService');
    }
}
exports.OspolicyComStack = OspolicyComStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3Nwb2xpY3kuY29tLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsib3Nwb2xpY3kuY29tLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQyxtREFBbUQ7QUFDbkQseUNBQXlDO0FBQ3pDLDZDQUE0RDtBQUM1RCwyQ0FBMkM7QUFDM0MseURBQXlEO0FBQ3pELCtEQUFrRTtBQUNsRSwwREFBMEQ7QUFDMUQsMERBQTBEO0FBQzFELGtFQUFrRTtBQUNsRSw4REFBOEQ7QUFDOUQscURBQXFEO0FBR3JELE1BQWEsZ0JBQWlCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixtQkFBbUI7UUFDbkIsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUM7UUFFdEMsZUFBZTtRQUNmLGtCQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDN0Msa0JBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUU1QyxxQkFBcUI7UUFDckIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRTNGLHFCQUFxQjtRQUNyQixNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQ2pGO1lBQ0UsVUFBVSxFQUFFLFVBQVU7WUFDdEIsVUFBVSxFQUFFLElBQUk7WUFDaEIsTUFBTSxFQUFFLFdBQVc7U0FDcEIsQ0FBQyxDQUFDO1FBRUws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QzNCLGtCQUFrQixFQUFFLElBQUk7WUFDeEIsaUJBQWlCLEVBQUUsWUFBWTtZQUMvQixlQUFlLEVBQUU7Z0JBQ2YsTUFBTSxFQUFFLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUU7b0JBQ3pDLG9CQUFvQixFQUFFLDhCQUE4QjtpQkFDckQsQ0FBQztnQkFDRixvQkFBb0IsRUFBRSxDQUFDO3dCQUNyQixRQUFRLEVBQUUsZUFBZTt3QkFDekIsU0FBUyxFQUFFLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjO3FCQUN2RCxDQUFDO2dCQUNGLG9CQUFvQixFQUFFLHFDQUFvQixDQUFDLGlCQUFpQjtnQkFDNUQscUJBQXFCLEVBQUUsb0JBQW9CO2FBQzVDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUNuRCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ25ELGlCQUFpQixFQUFFLFlBQVk7WUFDL0IsWUFBWSxFQUFFLHNCQUFzQjtZQUNwQyxpQkFBaUIsRUFBRSxDQUFDLElBQUksQ0FBQztTQUMxQixDQUFDLENBQUM7UUFFSCx3Q0FBd0M7UUFDeEMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDbkMsVUFBVSxFQUFFLFVBQVU7WUFDdEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksY0FBYyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDbkcsSUFBSTtTQUNMLENBQUMsQ0FBQztRQUVILHdCQUF3QjtRQUN4QiwwREFBMEQ7SUFDNUQsQ0FBQztDQUNGO0FBekhELDRDQXlIQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIHJvdXRlNTMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IER1cmF0aW9uLCBSZW1vdmFsUG9saWN5LCBUYWdzIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgeyBWaWV3ZXJQcm90b2NvbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIGFjbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcbmltcG9ydCAqIGFzIHMzZGVwbG95IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1kZXBsb3ltZW50JztcbmltcG9ydCAqIGFzIHJvdXRlNTNUYXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcbi8vaW1wb3J0ICogYXMgd2lkZ2V0X3NlcnZpY2UgZnJvbSBcIi4vd2lkZ2V0X3NlcnZpY2VcIjtcblxuXG5leHBvcnQgY2xhc3MgT3Nwb2xpY3lDb21TdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIGNyZWF0ZSB2YXJpYWJsZXNcbiAgICBjb25zdCBkb21haW5OYW1lID0gJ3d3dy5vc3BvbGljeS5jb20nO1xuXG4gICAgLy9UYWcgdGhlIHN0YWNrXG4gICAgVGFncy5vZih0aGlzKS5hZGQoJ1Byb2plY3QnLCAnb3Nwb2xpY3kuY29tJyk7XG4gICAgVGFncy5vZih0aGlzKS5hZGQoJ093bmVyJywgJ1BhdWwgUG90dG9yZmYnKTtcblxuICAgIC8vIGNyZWF0ZSB6b25lIHJlY29yZFxuICAgIGNvbnN0IHpvbmUgPSByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUxvb2t1cCh0aGlzLCAnSG9zdGVkWm9uZScsIHsgZG9tYWluTmFtZTogZG9tYWluTmFtZSB9KTtcblxuICAgIC8vIGNyZWF0ZSBjZXJ0aWZpY2F0ZVxuICAgIGNvbnN0IGNlcnRpZmljYXRlID0gbmV3IGFjbS5EbnNWYWxpZGF0ZWRDZXJ0aWZpY2F0ZSh0aGlzLCAnb3Nwb2xpY3lTaXRlQ2VydGlmaWNhdGUnLFxuICAgICAge1xuICAgICAgICBkb21haW5OYW1lOiBkb21haW5OYW1lLFxuICAgICAgICBob3N0ZWRab25lOiB6b25lLFxuICAgICAgICByZWdpb246ICd1cy1lYXN0LTEnLCAvLyBDbG91ZGZyb250IG9ubHkgY2hlY2tzIHRoaXMgcmVnaW9uIGZvciBjZXJ0aWZpY2F0ZXMuXG4gICAgICB9KTtcblxuICAgIC8vIGNyZWF0ZSBzMyBidWNrZXQgZm9yIENsb3VkRnJvbnQgYW5kIHB1dCB0byBPQUlcbiAgICBjb25zdCBhc3NldHNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdvc3BvbGljeS1TdGF0aWNBc3NldHMtYnVja2V0Jywge1xuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWVcbiAgICB9KTtcbiAgICBcbiAgICBjb25zdCBjbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHkgPSBuZXcgY2xvdWRmcm9udC5PcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLCAnQ2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5Jyk7XG5cbiAgICBhc3NldHNCdWNrZXQuYWRkVG9SZXNvdXJjZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxuICAgICAgcmVzb3VyY2VzOiBbYXNzZXRzQnVja2V0LmFybkZvck9iamVjdHMoJyonKV0sXG4gICAgICBwcmluY2lwYWxzOiBbbmV3IGlhbS5DYW5vbmljYWxVc2VyUHJpbmNpcGFsKGNsb3VkZnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eS5jbG91ZEZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHlTM0Nhbm9uaWNhbFVzZXJJZCldLFxuICAgIH0pKTtcblxuICAgIC8vIEFkZCBhIGZ1bmN0aW9uIHRvIHRoZSBjbG91ZGZyb250IGRpc3RyaWJ1dGlvblxuICAgIGNvbnN0IHJld3JpdGVGdW5jdGlvbiA9IG5ldyBjbG91ZGZyb250LkZ1bmN0aW9uKHRoaXMsICdGdW5jdGlvbicsIHtcbiAgICAgIGNvZGU6IGNsb3VkZnJvbnQuRnVuY3Rpb25Db2RlLmZyb21GaWxlKHsgZmlsZVBhdGg6ICdmdW5jdGlvbnMvdXJsLXJld3JpdGUuanMnIH0pLFxuICAgIH0pO1xuXG4gICAgLy8gY29uZmlndXJlIGhlYWRlciBwb2xpY2llc1xuICAgIGNvbnN0IHJlc3BvbnNlSGVhZGVyUG9saWN5ID0gbmV3IGNsb3VkZnJvbnQuUmVzcG9uc2VIZWFkZXJzUG9saWN5KHRoaXMsICdTZWN1cml0eUhlYWRlcnNSZXNwb25zZUhlYWRlclBvbGljeScsIHtcbiAgICAgIGNvbW1lbnQ6ICdTZWN1cml0eSBoZWFkZXJzIHJlc3BvbnNlIGhlYWRlciBwb2xpY3knLFxuICAgICAgc2VjdXJpdHlIZWFkZXJzQmVoYXZpb3I6IHtcbiAgICAgICAgY29udGVudFNlY3VyaXR5UG9saWN5OiB7XG4gICAgICAgICAgb3ZlcnJpZGU6IHRydWUsXG4gICAgICAgICAgY29udGVudFNlY3VyaXR5UG9saWN5OiBcImRlZmF1bHQtc3JjICdzZWxmJ1wiXG4gICAgICAgIH0sXG4gICAgICAgIHN0cmljdFRyYW5zcG9ydFNlY3VyaXR5OiB7XG4gICAgICAgICAgb3ZlcnJpZGU6IHRydWUsXG4gICAgICAgICAgYWNjZXNzQ29udHJvbE1heEFnZTogRHVyYXRpb24uZGF5cygyICogMzY1KSxcbiAgICAgICAgICBpbmNsdWRlU3ViZG9tYWluczogdHJ1ZSxcbiAgICAgICAgICBwcmVsb2FkOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRlbnRUeXBlT3B0aW9uczoge1xuICAgICAgICAgIG92ZXJyaWRlOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHJlZmVycmVyUG9saWN5OiB7XG4gICAgICAgICAgb3ZlcnJpZGU6IHRydWUsXG4gICAgICAgICAgcmVmZXJyZXJQb2xpY3k6IGNsb3VkZnJvbnQuSGVhZGVyc1JlZmVycmVyUG9saWN5LlNUUklDVF9PUklHSU5fV0hFTl9DUk9TU19PUklHSU5cbiAgICAgICAgfSxcbiAgICAgICAgeHNzUHJvdGVjdGlvbjoge1xuICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxuICAgICAgICAgIHByb3RlY3Rpb246IHRydWUsXG4gICAgICAgICAgbW9kZUJsb2NrOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGZyYW1lT3B0aW9uczoge1xuICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxuICAgICAgICAgIGZyYW1lT3B0aW9uOiBjbG91ZGZyb250LkhlYWRlcnNGcmFtZU9wdGlvbi5ERU5ZXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGNyZWF0ZSBjbG91ZGZyb250IGRpc3RyaWJ1dGlvblxuICAgIGNvbnN0IGNsb3VkZnJvbnREaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Nsb3VkRnJvbnREaXN0cmlidXRpb24nLCB7XG4gICAgICBjZXJ0aWZpY2F0ZTogY2VydGlmaWNhdGUsXG4gICAgICBkb21haW5OYW1lczogW2RvbWFpbk5hbWVdLFxuICAgICAgZW5hYmxlTG9nZ2luZzogdHJ1ZSxcbiAgICAgIGxvZ0J1Y2tldDogbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQ2xvdWRGcm9udExvZ0J1Y2tldCcsIHtcbiAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSwgXG4gICAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICB9KSxcbiAgICAgIGxvZ0ZpbGVQcmVmaXg6ICdjbG91ZGZyb250JyxcbiAgICAgIGxvZ0luY2x1ZGVzQ29va2llczogdHJ1ZSxcbiAgICAgIGRlZmF1bHRSb290T2JqZWN0OiAnaW5kZXguaHRtbCcsXG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbihhc3NldHNCdWNrZXQsIHtcbiAgICAgICAgICBvcmlnaW5BY2Nlc3NJZGVudGl0eTogY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5XG4gICAgICAgIH0pLFxuICAgICAgICBmdW5jdGlvbkFzc29jaWF0aW9uczogW3tcbiAgICAgICAgICBmdW5jdGlvbjogcmV3cml0ZUZ1bmN0aW9uLFxuICAgICAgICAgIGV2ZW50VHlwZTogY2xvdWRmcm9udC5GdW5jdGlvbkV2ZW50VHlwZS5WSUVXRVJfUkVRVUVTVFxuICAgICAgICB9XSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IFZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3k6IHJlc3BvbnNlSGVhZGVyUG9saWN5XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveVdlYnNpdGUnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KCcuL3NpdGUtY29udGVudHMnKV0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogYXNzZXRzQnVja2V0LFxuICAgICAgZGlzdHJpYnV0aW9uOiBjbG91ZGZyb250RGlzdHJpYnV0aW9uLFxuICAgICAgZGlzdHJpYnV0aW9uUGF0aHM6IFsnLyonXVxuICAgIH0pO1xuXG4gICAgLy8gY3JlYXRlIHJvdXRlNTMgcmVjb3JkIGZvciB0aGUgd2Vic2l0ZVxuICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0FSZWNvcmQnLCB7XG4gICAgICByZWNvcmROYW1lOiBkb21haW5OYW1lLFxuICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMobmV3IHJvdXRlNTNUYXJnZXRzLkNsb3VkRnJvbnRUYXJnZXQoY2xvdWRmcm9udERpc3RyaWJ1dGlvbikpLFxuICAgICAgem9uZVxuICAgIH0pO1xuXG4gICAgLy8gY3JlYXRlIHdpZGdldCBzZXJ2aWNlXG4gICAgLy9uZXcgd2lkZ2V0X3NlcnZpY2UuV2lkZ2V0U2VydmljZSh0aGlzLCAnV2lkZ2V0U2VydmljZScpO1xuICB9XG59XG4iXX0=