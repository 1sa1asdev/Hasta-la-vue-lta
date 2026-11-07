# Azure Hosting

## 1. Hosting platform

The project uses Azure Container Apps as its intended staging hosting platform.

The application is deployed using Docker container images for the client and API.

The staging configuration is defined in:

- `infra/azure/staging.yaml`
- `infra/azure/skapa-staging.sh`
- `infra/azure/identitet.sh`

## 2. Architecture

The staging configuration defines four containers within one Azure Container App:

| Container | Technology | CPU | Memory |
|---|---|---:|---:|
| Client | Nginx/client image | 0.25 | 0.5 GiB |
| API | Node.js/API image | 0.5 | 1 GiB |
| Database | PostgreSQL 16 | 0.5 | 1 GiB |
| Database | MongoDB 8.2 | 0.5 | 1 GiB |

The client is exposed externally through HTTP ingress.

The API is not exposed directly. The client communicates with the API internally using `http://localhost:4000`.

## 3. Scaling and cold starts

The staging configuration specifies:

- Minimum replicas: 0
- Maximum replicas: 1

This allows the application to scale to zero when idle.

When a request arrives after the application has scaled to zero, Azure must start the containers again. This causes a cold start.

The deployment script estimates that the first wake-up can take approximately one minute. This is an estimate and should be measured after deployment.

The maximum of one replica keeps the application and database containers together.

## 4. Database configuration and persistence

The staging configuration runs PostgreSQL 16 and MongoDB 8.2 as containers alongside the application.

Local development uses named Docker Compose volumes:

- `utpost_pgdata`
- `utpost_mongodata`

These provide persistent local database storage.

The Azure staging configuration does not define equivalent persistent volumes. Therefore, staging database persistence must be verified, and staging data should not be treated as durable until this is resolved.

## 5. Secrets and authentication

The staging configuration uses Azure Container Apps secrets for:

- JWT signing secret
- PostgreSQL password
- MongoDB credentials

GitHub Actions deployment authentication is designed to use OpenID Connect (OIDC).

OIDC allows GitHub Actions to authenticate to Azure without storing Azure credentials as GitHub secrets.

## 6. Azure region

The deployment script defaults to:

- Region: Sweden Central
- Resource group: `utpost-maria-rios-rg`
- Container Apps environment: `utpost-env`

These are script defaults. The actual deployed resource configuration must be checked in Azure Portal.

## 7. Resource usage and costs

The CPU and memory values in this document are configured container allocations, not actual measured usage.

Actual resource consumption and Azure costs must be checked in Azure Cost Management and Azure Monitor after deployment.

## 8. Current deployment status

This document describes the intended staging configuration in the repository.

The existence of an Azure resource group does not confirm that the application is deployed. Deployment status, running revisions, persistence, and production configuration must be verified separately.