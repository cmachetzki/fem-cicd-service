import * as github from "@pulumi/github";

const repository = new github.Repository("fem-cicd-service", {
    name: "fem-cicd-service",
    visibility: "public",
});

export const repoName = repository.name;
export const repoUrl = repository.htmlUrl;
