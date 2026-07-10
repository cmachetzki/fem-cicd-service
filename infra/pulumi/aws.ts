import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface AwsStackArgs {
    githubRepoFullName: pulumi.Input<string>;
}

export function createAwsResources(args: AwsStackArgs) {
    const bucketName = pulumi.output(args.githubRepoFullName).apply((fullName) => {
        const repoName = fullName.split("/").pop() ?? fullName;
        return `cmach-${repoName}`;
    });

    const githubActionsOidcProvider = new aws.iam.OpenIdConnectProvider("github-actions-oidc-provider", {
        url: "https://token.actions.githubusercontent.com",
        clientIdLists: ["sts.amazonaws.com"],
        thumbprintLists: ["22ff89586561fc2d52f77491e9f1eff1b80be33e"],
    });

    const bucket = new aws.s3.Bucket("fem-cicd-service", {
        bucket: bucketName,
        forceDestroy: true,
    });

    const githubActionsDeployRole = new aws.iam.Role("fem-cicd-service-github-actions-role", {
        name: "fem-cicd-service-github-actions-role",
        assumeRolePolicy: pulumi.all([githubActionsOidcProvider.arn, args.githubRepoFullName]).apply(([providerArn, fullName]) =>
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

    return {
        bucket,
        githubActionsOidcProvider,
        githubActionsDeployRole,
        website,
    };
}
