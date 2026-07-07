import * as github from "@pulumi/github";
import * as aws from "@pulumi/aws";

const repository = new github.Repository("fem-cicd-service", {
    name: "fem-cicd-service",
    visibility: "public",
});

const bucket = new aws.s3.Bucket("fem-cicd-service", {
    bucket: repository.name.apply((name) => `cmach-${name}`),
    forceDestroy: true,
});

new aws.s3.BucketPublicAccessBlock("fem-cicd-service-public-access-block", {
    bucket: bucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
});

const website = new aws.s3.BucketWebsiteConfiguration("fem-cicd-service-website", {
    bucket: bucket.id,
    indexDocument: {
        suffix: "index.html",
    },
    errorDocument: {
        key: "error.html",
    },
});

new aws.s3.BucketPolicy("fem-cicd-service-policy", {
    bucket: bucket.id,
    policy: bucket.arn.apply((arn) =>
        JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "PublicReadGetObject",
                    Effect: "Allow",
                    Principal: "*",
                    Action: ["s3:GetObject"],
                    Resource: [`${arn}/*`],
                },
            ],
        }),
    ),
});

export const repoName = repository.name;
export const repoUrl = repository.htmlUrl;
export const bucketName = bucket.id;
export const bucketArn = bucket.arn;
export const websiteEndpoint = website.websiteEndpoint;
export const websiteDomain = website.websiteDomain;
