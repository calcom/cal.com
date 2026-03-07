import type { Command } from "commander";
import {
  organizationsDelegationCredentialControllerCreateDelegationCredential as createDelegationCredential,
  meControllerGetMe as getMe,
  organizationsDelegationCredentialControllerUpdateDelegationCredential as updateDelegationCredential,
} from "../../generated/sdk.gen";
import type {
  CreateDelegationCredentialInput,
  GoogleServiceAccountKeyInput,
  MicrosoftServiceAccountKeyInput,
  UpdateDelegationCredentialInput,
} from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";
import { renderDelegationCredentialCreated, renderDelegationCredentialUpdated } from "./output";

async function getOrgId(): Promise<number> {
  const { data: response } = await getMe({ headers: authHeader() });
  const me = response?.data;

  if (!me) {
    throw new Error("Could not fetch your profile. Are you logged in?");
  }
  if (!me.organizationId) {
    throw new Error(
      "Delegation credentials require an organization. Your account does not belong to an organization."
    );
  }

  return me.organizationId;
}

function parseServiceAccountKey(
  keyJson: string
): GoogleServiceAccountKeyInput | MicrosoftServiceAccountKeyInput {
  const parsed = JSON.parse(keyJson) as Record<string, unknown>;

  if ("tenant_id" in parsed) {
    return {
      private_key: String(parsed.private_key),
      tenant_id: String(parsed.tenant_id),
      client_id: String(parsed.client_id),
    };
  }

  return {
    private_key: String(parsed.private_key),
    client_email: String(parsed.client_email),
    client_id: String(parsed.client_id),
  };
}

function registerDelegationCredentialMutationCommands(delegationCredentialsCmd: Command): void {
  delegationCredentialsCmd
    .command("create")
    .description("Create a delegation credential for your organization")
    .requiredOption("--workspace-platform-slug <slug>", "Workspace platform slug (e.g., google, microsoft)")
    .requiredOption("--domain <domain>", "Domain for the delegation credential")
    .requiredOption("--service-account-key <json>", "Service account key JSON (Google or Microsoft format)")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        workspacePlatformSlug: string;
        domain: string;
        serviceAccountKey: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const serviceAccountKey = parseServiceAccountKey(options.serviceAccountKey);

          const body: CreateDelegationCredentialInput = {
            workspacePlatformSlug: options.workspacePlatformSlug,
            domain: options.domain,
            serviceAccountKey: [serviceAccountKey],
          };

          const { data: response } = await createDelegationCredential({
            path: { orgId },
            body,
            headers: authHeader(),
          });

          renderDelegationCredentialCreated(response?.data, options);
        });
      }
    );

  delegationCredentialsCmd
    .command("update <credentialId>")
    .description("Update a delegation credential")
    .option("--enabled <value>", "Enable or disable the credential (true/false)")
    .option("--service-account-key <json>", "New service account key JSON (Google or Microsoft format)")
    .option("--json", "Output as JSON")
    .action(
      async (
        credentialId: string,
        options: {
          enabled?: string;
          serviceAccountKey?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const body: UpdateDelegationCredentialInput = {};

          if (options.enabled !== undefined) {
            body.enabled = options.enabled === "true";
          }

          if (options.serviceAccountKey) {
            const serviceAccountKey = parseServiceAccountKey(options.serviceAccountKey);
            body.serviceAccountKey = [serviceAccountKey];
          }

          const { data: response } = await updateDelegationCredential({
            path: { orgId, credentialId },
            body,
            headers: authHeader(),
          });

          renderDelegationCredentialUpdated(response?.data, options);
        });
      }
    );
}

export function registerDelegationCredentialsCommand(program: Command): void {
  const delegationCredentialsCmd = program
    .command("delegation-credentials")
    .description("Manage organization delegation credentials");
  registerDelegationCredentialMutationCommands(delegationCredentialsCmd);
}
