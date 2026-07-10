import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import * as aws from "@pulumi/aws";

const repository = new github.Repository("fem-cicd-service", {
    name: "fem-cicd-service",
    visibility: "public",
}, {
    retainOnDelete: true,
});

new github.BranchProtection("fem-cicd-service-main-branch-protection", {
    repositoryId: repository.nodeId,
    pattern: "main",
    enforceAdmins: true,
    allowsForcePushes: false,
    allowsDeletions: false,
    requireConversationResolution: true,
    requiredLinearHistory: true,
    requiredStatusChecks: [{
        strict: true,
        contexts: ["CI / build"],
    }],
    requiredPullRequestReviews: [{
        requiredApprovingReviewCount: 1,
        dismissStaleReviews: true,
        restrictDismissals: true,
    }],
}, {
    retainOnDelete: true,
});

const productionEnvironment = new github.RepositoryEnvironment("fem-cicd-service-production-environment", {
    repository: repository.name,
    environment: "production",
    reviewers: [{
        users: [github.getUserOutput({ username: "" }).apply((user) => Number(user.id))],
    }],
    waitTimer: 1,
}, {
    retainOnDelete: true,
});

const githubActionsOidcProvider = new aws.iam.OpenIdConnectProvider("github-actions-oidc-provider", {
    url: "https://token.actions.githubusercontent.com",
    clientIdLists: ["sts.amazonaws.com"],
});

const bucket = new aws.s3.Bucket("fem-cicd-service", {
    bucket: repository.name.apply((name) => `cmach-${name}`),
    forceDestroy: true,
});

const githubActionsDeployRole = new aws.iam.Role("fem-cicd-service-github-actions-role", {
    name: "fem-cicd-service-github-actions-role",
    assumeRolePolicy: pulumi.all([githubActionsOidcProvider.arn, repository.fullName]).apply(([providerArn, fullName]) =>
        JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: "sts:AssumeRoleWithWebIdentity",
                    Principal: {
                        Federated: providerArn,
                    },
                    Condition: {
                        StringEquals: {
                            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                        },
                        StringLike: {
                            "token.actions.githubusercontent.com:sub": [
                                `repo:${fullName}:ref:refs/heads/main`,
                                `repo:${fullName}:environment:production`,
                            ],
                        },
                    },
                },
            ],
        }),
    ),
});

new aws.iam.RolePolicy("fem-cicd-service-github-actions-role-policy", {
    role: githubActionsDeployRole.name,
    policy: bucket.arn.apply((arn) =>
        JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: ["s3:ListBucket", "s3:GetBucketLocation"],
                    Resource: [arn],
                },
                {
                    Effect: "Allow",
                    Action: ["s3:PutObject", "s3:DeleteObject"],
                    Resource: [`${arn}/*`],
                },
            ],
        }),
    ),
});

new github.ActionsVariable("fem-cicd-service-aws-role-to-assume", {
    repository: repository.name,
    variableName: "AWS_ROLE_TO_ASSUME",
    value: githubActionsDeployRole.arn,
}, {
    retainOnDelete: true,
});

const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("fem-cicd-service-public-access-block", {
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
}, {
    dependsOn: [publicAccessBlock],
});

const uploader = new aws.iam.User("fem-cicd-service-uploader", {
    name: "fem-cicd-service-uploader",
});

new aws.iam.UserPolicy("fem-cicd-service-uploader-policy", {
    user: uploader.name,
    policy: bucket.arn.apply((arn) =>
        JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Action: ["s3:ListBucket", "s3:GetBucketLocation"],
                    Resource: [arn],
                },
                {
                    Effect: "Allow",
                    Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
                    Resource: [`${arn}/*`],
                },
            ],
        }),
    ),
});

const uploaderAccessKey = new aws.iam.AccessKey("fem-cicd-service-uploader-access-key", {
    user: uploader.name,
});

export const repoName = repository.name;
export const repoUrl = repository.htmlUrl;
export const productionEnvironmentName = productionEnvironment.environment;
export const githubActionsOidcProviderArn = githubActionsOidcProvider.arn;
export const githubActionsDeployRoleArn = githubActionsDeployRole.arn;
export const bucketName = bucket.id;
export const bucketArn = bucket.arn;
export const websiteEndpoint = website.websiteEndpoint;
export const websiteDomain = website.websiteDomain;
export const uploaderUserName = uploader.name;
export const uploaderAccessKeyId = uploaderAccessKey.id;
export const uploaderSecretAccessKey = pulumi.secret(uploaderAccessKey.secret);
