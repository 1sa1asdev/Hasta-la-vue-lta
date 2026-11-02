#!/usr/bin/env bash
set -euo pipefail

: "${REPO:?Sätt REPO=<ägare>/<repo>}"
RG="${RG:-utpost-maria-rios-rg}"
APP="${APP:-hasta-la-vue-lta-staging}"
GH_ENV="${GH_ENV:-azure-staging}"
NAME="${NAME:-${REPO##*/}-github}"

SUB="$(az account show --query id --output tsv)"
TENANT="$(az account show --query tenantId --output tsv)"

echo "→ app registration + service principal: ${NAME}"
APPID="$(az ad app list --display-name "${NAME}" --query '[0].appId' --output tsv)"
if [ -z "${APPID}" ]; then
  APPID="$(az ad app create --display-name "${NAME}" --query appId --output tsv)"
fi

az ad sp show --id "${APPID}" --output none 2>/dev/null ||
  az ad sp create --id "${APPID}" --output none

echo "→ Contributor på resursgruppen ${RG}"
TILLDELAD=""
for i in 1 2 3 4 5 6; do
  if az role assignment create \
    --role Contributor \
    --assignee "${APPID}" \
    --scope "/subscriptions/${SUB}/resourceGroups/${RG}" \
    --output none; then
    TILLDELAD=ja
    break
  fi
  echo "Väntar på identiteten, försök ${i}/6"
  sleep 10
done

if [ -z "${TILLDELAD}" ]; then
  echo "FEL: Kunde inte tilldela Contributor. Kontrollera behörighet." >&2
  exit 1
fi

REPO_ID="$(gh api "repos/${REPO}" --jq .id)"
OWNER_ID="$(gh api "repos/${REPO}" --jq .owner.id)"
SUBJECT="repo:${REPO%%/*}@${OWNER_ID}/${REPO##*/}@${REPO_ID}:environment:${GH_ENV}"

echo "→ Federerad identitet: ${SUBJECT}"
az ad app federated-credential show \
  --id "${APPID}" \
  --federated-credential-id "github-${GH_ENV}" \
  --output none 2>/dev/null ||
az ad app federated-credential create \
  --id "${APPID}" \
  --parameters "{\"name\":\"github-${GH_ENV}\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"${SUBJECT}\",\"audiences\":[\"api://AzureADTokenExchange\"]}" \
  --output none

FQDN="$(az containerapp show \
  --name "${APP}" \
  --resource-group "${RG}" \
  --query properties.configuration.ingress.fqdn \
  --output tsv)"

echo
echo "GitHub environment: ${GH_ENV}"
echo "Skapa variablerna med följande kommandon:"
echo "gh api -X PUT repos/${REPO}/environments/${GH_ENV} > /dev/null"
echo "gh variable set AZURE_CLIENT_ID --env ${GH_ENV} --repo ${REPO} --body ${APPID}"
echo "gh variable set AZURE_TENANT_ID --env ${GH_ENV} --repo ${REPO} --body ${TENANT}"
echo "gh variable set AZURE_SUBSCRIPTION_ID --env ${GH_ENV} --repo ${REPO} --body ${SUB}"
echo "gh variable set AZURE_RG --env ${GH_ENV} --repo ${REPO} --body ${RG}"
echo "gh variable set AZURE_APP --env ${GH_ENV} --repo ${REPO} --body ${APP}"
echo "gh variable set AZURE_URL --env ${GH_ENV} --repo ${REPO} --body https://${FQDN}"