import * as pulumi from "@pulumi/pulumi";
import { createAwsResources } from "./aws";
import { createGitHubResources } from "./github";

const stack = pulumi.getStack();

export let repoName: pulumi.Output<string> | undefined;
export let repoUrl: pulumi.Output<string> | undefined;
export let productionEnvironmentName: pulumi.Output<string> | undefined;
export let githubActionsOidcProviderArn: pulumi.Output<string> | undefined;
export let githubActionsDeployRoleArn: pulumi.Output<string> | undefined;
export let bucketName: pulumi.Output<string> | undefined;
export let bucketArn: pulumi.Output<string> | undefined;
export let websiteEndpoint: pulumi.Output<string> | undefined;
export let websiteDomain: pulumi.Output<string> | undefined;

if (stack === "aws") {
    const config = new pulumi.Config();
    const githubRepoFullName = config.require("githubRepoFullName");
    const awsResources = createAwsResources({ githubRepoFullName });

    bucketName = awsResources.bucket.id;
    bucketArn = awsResources.bucket.arn;
    githubActionsOidcProviderArn = awsResources.githubActionsOidcProvider.arn;
    githubActionsDeployRoleArn = awsResources.githubActionsDeployRole.arn;
    websiteEndpoint = awsResources.website.websiteEndpoint;
    websiteDomain = awsResources.website.websiteDomain;
} else if (stack === "github") {
    const awsStack = new pulumi.StackReference(`organization/${pulumi.getProject()}/aws`);
    const githubResources = createGitHubResources({
        githubActionsDeployRoleArn: awsStack.getOutput("githubActionsDeployRoleArn"),
    });

    repoName = githubResources.repository.name;
    repoUrl = githubResources.repository.htmlUrl;
    productionEnvironmentName = githubResources.productionEnvironment.environment;
} else {
    const config = new pulumi.Config();
    const githubRepoFullName = config.get("githubRepoFullName") ?? "cmachetzki/fem-cicd-service";
    const awsResources = createAwsResources({ githubRepoFullName });
    const githubResources = createGitHubResources({
        githubActionsDeployRoleArn: awsResources.githubActionsDeployRole.arn,
    });

    repoName = githubResources.repository.name;
    repoUrl = githubResources.repository.htmlUrl;
    productionEnvironmentName = githubResources.productionEnvironment.environment;
    githubActionsOidcProviderArn = awsResources.githubActionsOidcProvider.arn;
    githubActionsDeployRoleArn = awsResources.githubActionsDeployRole.arn;
    bucketName = awsResources.bucket.id;
    bucketArn = awsResources.bucket.arn;
    websiteEndpoint = awsResources.website.websiteEndpoint;
    websiteDomain = awsResources.website.websiteDomain;
}
