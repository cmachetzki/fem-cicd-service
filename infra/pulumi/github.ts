import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";

export interface GitHubStackArgs {
    githubActionsDeployRoleArn: pulumi.Input<string>;
}

export function createGitHubResources(args: GitHubStackArgs) {
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

    new github.ActionsVariable("fem-cicd-service-aws-role-to-assume", {
        repository: repository.name,
        variableName: "AWS_ROLE_TO_ASSUME",
        value: args.githubActionsDeployRoleArn,
    }, {
        retainOnDelete: true,
    });

    return {
        repository,
        productionEnvironment,
    };
}
