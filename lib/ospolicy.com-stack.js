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
        // create widget service
        //new widget_service.WidgetService(this, 'WidgetService');
    }
}
exports.OspolicyComStack = OspolicyComStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3Nwb2xpY3kuY29tLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsib3Nwb2xpY3kuY29tLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQyxtREFBbUQ7QUFDbkQseUNBQXlDO0FBQ3pDLDZDQUE0RDtBQUM1RCwyQ0FBMkM7QUFDM0MseURBQXlEO0FBQ3pELCtEQUFrRTtBQUNsRSwwREFBMEQ7QUFDMUQsMERBQTBEO0FBQzFELGtFQUFrRTtBQUNsRSw4REFBOEQ7QUFDOUQscURBQXFEO0FBR3JELE1BQWEsZ0JBQWlCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixtQkFBbUI7UUFDbkIsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUM7UUFFdEMsZUFBZTtRQUNmLGtCQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDN0Msa0JBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUU1QyxxQkFBcUI7UUFDckIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRTNGLDBCQUEwQjtRQUMxQixNQUFNLFdBQVcsR0FBRztZQUNsQixVQUFVLEVBQUUsY0FBYztZQUMxQixHQUFHLEVBQUUsc0JBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLE1BQU0sRUFBRSxJQUFJO1lBQ1osUUFBUSxFQUFFLElBQUk7WUFDZCxRQUFRLEVBQUUsTUFBTTtTQUNq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QUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQ25DLFVBQVUsRUFBRSxVQUFVO1lBQ3RCLE1BQU0sRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ25HLElBQUk7U0FDTCxDQUFDLENBQUM7UUFFSCx3QkFBd0I7UUFDeEIsMERBQTBEO0lBQzVELENBQUM7Q0FDRjtBQXpJRCw0Q0F5SUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgeyBEdXJhdGlvbiwgUmVtb3ZhbFBvbGljeSwgVGFncyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0IHsgVmlld2VyUHJvdG9jb2xQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBhY20gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCc7XG5pbXBvcnQgKiBhcyByb3V0ZTUzVGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1My10YXJnZXRzJztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG4vL2ltcG9ydCAqIGFzIHdpZGdldF9zZXJ2aWNlIGZyb20gXCIuL3dpZGdldF9zZXJ2aWNlXCI7XG5cblxuZXhwb3J0IGNsYXNzIE9zcG9saWN5Q29tU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBjcmVhdGUgdmFyaWFibGVzXG4gICAgY29uc3QgZG9tYWluTmFtZSA9ICd3d3cub3Nwb2xpY3kuY29tJztcblxuICAgIC8vVGFnIHRoZSBzdGFja1xuICAgIFRhZ3Mub2YodGhpcykuYWRkKCdQcm9qZWN0JywgJ29zcG9saWN5LmNvbScpO1xuICAgIFRhZ3Mub2YodGhpcykuYWRkKCdPd25lcicsICdQYXVsIFBvdHRvcmZmJyk7XG5cbiAgICAvLyBjcmVhdGUgem9uZSByZWNvcmRcbiAgICBjb25zdCB6b25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Mb29rdXAodGhpcywgJ0hvc3RlZFpvbmUnLCB7IGRvbWFpbk5hbWU6IGRvbWFpbk5hbWUgfSk7XG5cbiAgICAvL2NyZWF0ZSBjb29raWUgcHJvcGVydGllc1xuICAgIGNvbnN0IGNvb2tpZVByb3BzID0ge1xuICAgICAgY29va2llTmFtZTogJ29zcG9saWN5LmNvbScsXG4gICAgICB0dGw6IER1cmF0aW9uLmRheXMoMCksXG4gICAgICBzZWN1cmU6IHRydWUsXG4gICAgICBodHRwT25seTogdHJ1ZSxcbiAgICAgIHNhbWVTaXRlOiAnTm9uZScsXG4gICAgfTtcbiAgICAvLyBjcmVhdGUgY2VydGlmaWNhdGVcbiAgICBjb25zdCBjZXJ0aWZpY2F0ZSA9IG5ldyBhY20uRG5zVmFsaWRhdGVkQ2VydGlmaWNhdGUodGhpcywgJ29zcG9saWN5U2l0ZUNlcnRpZmljYXRlJyxcbiAgICAgIHtcbiAgICAgICAgZG9tYWluTmFtZTogZG9tYWluTmFtZSxcbiAgICAgICAgaG9zdGVkWm9uZTogem9uZSxcbiAgICAgICAgcmVnaW9uOiAndXMtZWFzdC0xJywgLy8gQ2xvdWRmcm9udCBvbmx5IGNoZWNrcyB0aGlzIHJlZ2lvbiBmb3IgY2VydGlmaWNhdGVzLlxuICAgICAgfSk7XG5cbiAgICAvLyBjcmVhdGUgczMgYnVja2V0IGZvciBDbG91ZEZyb250IGFuZCBwdXQgdG8gT0FJXG4gICAgY29uc3QgYXNzZXRzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnb3Nwb2xpY3ktU3RhdGljQXNzZXRzLWJ1Y2tldCcsIHtcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlXG4gICAgfSk7XG4gICAgXG4gICAgY29uc3QgY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5ID0gbmV3IGNsb3VkZnJvbnQuT3JpZ2luQWNjZXNzSWRlbnRpdHkodGhpcywgJ0Nsb3VkRnJvbnRPcmlnaW5BY2Nlc3NJZGVudGl0eScpO1xuXG4gICAgYXNzZXRzQnVja2V0LmFkZFRvUmVzb3VyY2VQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnXSxcbiAgICAgIHJlc291cmNlczogW2Fzc2V0c0J1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyldLFxuICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uQ2Fub25pY2FsVXNlclByaW5jaXBhbChjbG91ZGZyb250T3JpZ2luQWNjZXNzSWRlbnRpdHkuY2xvdWRGcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5UzNDYW5vbmljYWxVc2VySWQpXSxcbiAgICB9KSk7XG5cbiAgICAvLyBBZGQgYSBmdW5jdGlvbiB0byB0aGUgY2xvdWRmcm9udCBkaXN0cmlidXRpb25cbiAgICBjb25zdCByZXdyaXRlRnVuY3Rpb24gPSBuZXcgY2xvdWRmcm9udC5GdW5jdGlvbih0aGlzLCAnRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBjbG91ZGZyb250LkZ1bmN0aW9uQ29kZS5mcm9tRmlsZSh7IGZpbGVQYXRoOiAnZnVuY3Rpb25zL3VybC1yZXdyaXRlLmpzJyB9KSxcbiAgICB9KTtcblxuICAgIC8vIGNvbmZpZ3VyZSBoZWFkZXIgcG9saWNpZXNcbiAgICBjb25zdCByZXNwb25zZUhlYWRlclBvbGljeSA9IG5ldyBjbG91ZGZyb250LlJlc3BvbnNlSGVhZGVyc1BvbGljeSh0aGlzLCAnU2VjdXJpdHlIZWFkZXJzUmVzcG9uc2VIZWFkZXJQb2xpY3knLCB7XG4gICAgICBjb21tZW50OiAnU2VjdXJpdHkgaGVhZGVycyByZXNwb25zZSBoZWFkZXIgcG9saWN5JyxcbiAgICAgIHNlY3VyaXR5SGVhZGVyc0JlaGF2aW9yOiB7XG4gICAgICAgIGNvbnRlbnRTZWN1cml0eVBvbGljeToge1xuICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxuICAgICAgICAgIGNvbnRlbnRTZWN1cml0eVBvbGljeTogXCJkZWZhdWx0LXNyYyAnc2VsZic7IGltZy1zcmMgJ3NlbGYnOyBzY3JpcHQtc3JjICdzZWxmJzsgc3R5bGUtc3JjICdzZWxmJzsgZm9udC1zcmMgJ3NlbGYnOyBjb25uZWN0LXNyYyAnc2VsZic7IGZyYW1lLWFuY2VzdG9ycyAnbm9uZSc7IGZvcm0tYWN0aW9uICdub25lJzsgYmFzZS11cmkgJ3NlbGYnOyBtYW5pZmVzdC1zcmMgJ3NlbGYnXCIsXG4gICAgICAgIH0sXG4gICAgICAgIHN0cmljdFRyYW5zcG9ydFNlY3VyaXR5OiB7XG4gICAgICAgICAgb3ZlcnJpZGU6IHRydWUsXG4gICAgICAgICAgYWNjZXNzQ29udHJvbE1heEFnZTogRHVyYXRpb24uZGF5cygyICogMzY1KSxcbiAgICAgICAgICBpbmNsdWRlU3ViZG9tYWluczogdHJ1ZSxcbiAgICAgICAgICBwcmVsb2FkOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGNvbnRlbnRUeXBlT3B0aW9uczoge1xuICAgICAgICAgIG92ZXJyaWRlOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHJlZmVycmVyUG9saWN5OiB7XG4gICAgICAgICAgb3ZlcnJpZGU6IHRydWUsXG4gICAgICAgICAgcmVmZXJyZXJQb2xpY3k6IGNsb3VkZnJvbnQuSGVhZGVyc1JlZmVycmVyUG9saWN5LlNUUklDVF9PUklHSU5fV0hFTl9DUk9TU19PUklHSU5cbiAgICAgICAgfSxcbiAgICAgICAgeHNzUHJvdGVjdGlvbjoge1xuICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxuICAgICAgICAgIHByb3RlY3Rpb246IHRydWUsXG4gICAgICAgICAgbW9kZUJsb2NrOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGZyYW1lT3B0aW9uczoge1xuICAgICAgICAgIG92ZXJyaWRlOiB0cnVlLFxuICAgICAgICAgIGZyYW1lT3B0aW9uOiBjbG91ZGZyb250LkhlYWRlcnNGcmFtZU9wdGlvbi5ERU5ZXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGNyZWF0ZSBjbG91ZGZyb250IGRpc3RyaWJ1dGlvblxuICAgIGNvbnN0IGNsb3VkZnJvbnREaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5EaXN0cmlidXRpb24odGhpcywgJ0Nsb3VkRnJvbnREaXN0cmlidXRpb24nLCB7XG4gICAgICBjZXJ0aWZpY2F0ZTogY2VydGlmaWNhdGUsXG4gICAgICBkb21haW5OYW1lczogW2RvbWFpbk5hbWVdLFxuICAgICAgZW5hYmxlTG9nZ2luZzogdHJ1ZSxcbiAgICAgIGxvZ0J1Y2tldDogbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQ2xvdWRGcm9udExvZ0J1Y2tldCcsIHtcbiAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSwgXG4gICAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICB9KSxcbiAgICAgIGxvZ0ZpbGVQcmVmaXg6ICdjbG91ZGZyb250JyxcbiAgICAgIGxvZ0luY2x1ZGVzQ29va2llczogdHJ1ZSxcbiAgICAgIGRlZmF1bHRSb290T2JqZWN0OiAnaW5kZXguaHRtbCcsXG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbihhc3NldHNCdWNrZXQsIHtcbiAgICAgICAgICBvcmlnaW5BY2Nlc3NJZGVudGl0eTogY2xvdWRmcm9udE9yaWdpbkFjY2Vzc0lkZW50aXR5XG4gICAgICAgIH0pLFxuICAgICAgICBmdW5jdGlvbkFzc29jaWF0aW9uczogW3tcbiAgICAgICAgICBmdW5jdGlvbjogcmV3cml0ZUZ1bmN0aW9uLFxuICAgICAgICAgIGV2ZW50VHlwZTogY2xvdWRmcm9udC5GdW5jdGlvbkV2ZW50VHlwZS5WSUVXRVJfUkVRVUVTVFxuICAgICAgICB9XSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IFZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3k6IHJlc3BvbnNlSGVhZGVyUG9saWN5XG4gICAgICB9LFxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgIHR0bDogRHVyYXRpb24uc2Vjb25kcygwKSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCAnRGVwbG95V2Vic2l0ZScsIHtcbiAgICAgIHNvdXJjZXM6IFtzM2RlcGxveS5Tb3VyY2UuYXNzZXQoJy4vc2l0ZS1jb250ZW50cycpXSxcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiBhc3NldHNCdWNrZXQsXG4gICAgICBkaXN0cmlidXRpb246IGNsb3VkZnJvbnREaXN0cmlidXRpb24sXG4gICAgICBkaXN0cmlidXRpb25QYXRoczogWycvKiddXG4gICAgfSk7XG5cbiAgICAvLyBjcmVhdGUgcm91dGU1MyByZWNvcmQgZm9yIHRoZSB3ZWJzaXRlXG4gICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQVJlY29yZCcsIHtcbiAgICAgIHJlY29yZE5hbWU6IGRvbWFpbk5hbWUsXG4gICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgcm91dGU1M1RhcmdldHMuQ2xvdWRGcm9udFRhcmdldChjbG91ZGZyb250RGlzdHJpYnV0aW9uKSksXG4gICAgICB6b25lXG4gICAgfSk7XG5cbiAgICAvLyBjcmVhdGUgd2lkZ2V0IHNlcnZpY2VcbiAgICAvL25ldyB3aWRnZXRfc2VydmljZS5XaWRnZXRTZXJ2aWNlKHRoaXMsICdXaWRnZXRTZXJ2aWNlJyk7XG4gIH1cbn1cbiJdfQ==