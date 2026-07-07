  # GitHub TypeScript Pulumi Program

  A minimal Pulumi program for provisioning GitHub infrastructure and an S3 bucket using TypeScript. This program creates a public repository named `fem-cicd-service` and a public S3 bucket configured for static website hosting.

 ## Prerequisites

 - Pulumi CLI (>= v3): https://www.pulumi.com/docs/get-started/install/
 - Node.js (>= 14): https://nodejs.org/
  - GitHub personal access token available as `GITHUB_TOKEN`

 ## Getting Started

  1. Preview and deploy your infrastructure:

     ```bash
     pulumi preview
     pulumi up
     ```

  2. When you're finished, tear down your stack:

    ```bash
    pulumi destroy
    pulumi stack rm
    ```

 ## Project Layout

  - `Pulumi.yaml` — Pulumi project and template metadata
  - `index.ts` — Main Pulumi program (creates a GitHub repository and S3 bucket)
  - `package.json` — Node.js dependencies
  - `tsconfig.json` — TypeScript compiler options

  ## Configuration

  | Key           | Description                             | Default     |
  | ------------- | --------------------------------------- | ----------- |
  | `GITHUB_TOKEN` | GitHub token used by the provider       | required    |

  The S3 bucket name is prefixed with `cmach-` to keep it globally unique.

  The bucket serves `index.html` as the website root and `error.html` for errors.

  The provider uses the account that owns `GITHUB_TOKEN` when no owner is set.

 ## Next Steps

  - Extend `index.ts` to provision repository settings, teams, or branch protection.
  - Explore [Pulumi GitHub](https://www.pulumi.com/registry/packages/github/) for more GitHub resources.
  - Consult the [Pulumi documentation](https://www.pulumi.com/docs/) for more examples and best practices.

 ## Getting Help

 If you encounter any issues or have suggestions, please open an issue in this repository.
