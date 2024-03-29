import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Duration, RemovalPolicy, Tags } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";


export class OspolicyComStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create variables
    const domainName = 'www.ospolicy.com';

    //Tag the stack
    Tags.of(this).add('Project', 'ospolicy.com');
    Tags.of(this).add('Owner', 'Paul Pottorff');

    // create zone record
    const zone = route53.HostedZone.fromLookup(this, 'HostedZone', { domainName: domainName });

    //create cookie properties
    const cookieProps = {
      cookieName: 'ospolicy.com',
      ttl: Duration.days(0),
      secure: true,
      httpOnly: true,
      sameSite: 'None',
    };
    // create certificate
    const certificate = new acm.DnsValidatedCertificate(this, 'ospolicySiteCertificate',
      {
        domainName: domainName,
        hostedZone: zone,
        region: 'us-east-1', // Cloudfront only checks this region for certificates.
      });

    // create s3 bucket for CloudFront and put to OAI
    const assetsBucket = new s3.Bucket(this, 'ospolicy-StaticAssets-bucket', {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
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
          accessControlMaxAge: Duration.days(2 * 365),
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
        removalPolicy: RemovalPolicy.DESTROY, 
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
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: responseHeaderPolicy
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
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

    // //create ecs fargate cluster from ecs_patterns
    
    // const vpc = new ec2.Vpc(this, "ECSVpc", {
    //   maxAzs: 3
    // }); 
  
    // const cluster = new ecs.Cluster(this, "MyCluster", {
    //   vpc: vpc
    // });
  
    // // Create a load-balanced Fargate service and make it public
    // new ecs_patterns.ApplicationLoadBalancedFargateService(this, "GoatService", {
    //   cluster: cluster, // Required
    //   cpu: 512, // Default is 256
    //   desiredCount: 6, // Default is 1
    //   taskImageOptions: { image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample") },
    //   memoryLimitMiB: 2048, // Default is 512
    //   publicLoadBalancer: true // Default is true
    // });
  }
  //create a public unencrypted s3 bucket
  readonly slopBucket = new s3.Bucket(this, 'MySloppyBucket', {
    versioned: false,
    encryption: s3.BucketEncryption.UNENCRYPTED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    RemovalPolicy: RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    publicReadAccess: true
  });
}
