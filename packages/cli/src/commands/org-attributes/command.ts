import type { Command } from "commander";
import {
  organizationsAttributesOptionsControllerAssignOrganizationAttributeOptionToUser as assignOptionToUser,
  organizationsAttributesControllerCreateOrganizationAttribute as createAttribute,
  organizationsAttributesOptionsControllerCreateOrganizationAttributeOption as createOption,
  organizationsAttributesControllerDeleteOrganizationAttribute as deleteAttribute,
  organizationsAttributesOptionsControllerDeleteOrganizationAttributeOption as deleteOption,
  organizationsAttributesControllerGetOrganizationAttribute as getAttribute,
  organizationsAttributesControllerGetOrganizationAttributes as getAttributes,
  meControllerGetMe as getMe,
  organizationsAttributesOptionsControllerGetOrganizationAttributeOptions as getOptions,
  organizationsAttributesOptionsControllerGetOrganizationAttributeOptionsForUser as getUserOptions,
  organizationsAttributesOptionsControllerUnassignOrganizationAttributeOptionFromUser as unassignOptionFromUser,
  organizationsAttributesControllerUpdateOrganizationAttribute as updateAttribute,
  organizationsAttributesOptionsControllerUpdateOrganizationAttributeOption as updateOption,
} from "../../generated/sdk.gen";
import type {
  AssignOrganizationAttributeOptionToUserInput,
  CreateOrganizationAttributeInput,
  CreateOrganizationAttributeOptionInput,
  UpdateOrganizationAttributeInput,
  UpdateOrganizationAttributeOptionInput,
} from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";

import {
  renderAttribute,
  renderAttributeCreated,
  renderAttributeDeleted,
  renderAttributeList,
  renderAttributeUpdated,
  renderOptionAssigned,
  renderOptionCreated,
  renderOptionDeleted,
  renderOptionList,
  renderOptionUnassigned,
  renderOptionUpdated,
  renderUserOptions,
} from "./output";

type AttributeType = CreateOrganizationAttributeInput["type"];

async function getOrgId(): Promise<number> {
  const { data: response } = await getMe({ headers: authHeader() });
  const me = response?.data;

  if (!me) {
    throw new Error("Could not fetch your profile. Are you logged in?");
  }
  if (!me.organizationId) {
    throw new Error(
      "Organization attributes require an organization. Your account does not belong to an organization."
    );
  }

  return me.organizationId;
}

function registerAttributeQueryCommands(attributesCmd: Command): void {
  attributesCmd
    .command("list")
    .description("List all organization attributes")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getAttributes({
          path: { orgId },
          headers: authHeader(),
        });

        renderAttributeList(response?.data, options);
      });
    });

  attributesCmd
    .command("get <attributeId>")
    .description("Get an attribute by ID")
    .option("--json", "Output as JSON")
    .action(async (attributeId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getAttribute({
          path: { orgId, attributeId },
          headers: authHeader(),
        });

        renderAttribute(response?.data, options);
      });
    });
}

function registerAttributeMutationCommands(attributesCmd: Command): void {
  attributesCmd
    .command("create")
    .description("Create a new organization attribute")
    .requiredOption("--name <name>", "Attribute name")
    .requiredOption("--slug <slug>", "Attribute slug")
    .requiredOption(
      "--type <type>",
      "Attribute type (TEXT, NUMBER, SINGLE_SELECT, MULTI_SELECT)"
    )
    .option("--enabled", "Enable the attribute (default: true)")
    .option("--disabled", "Disable the attribute")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        name: string;
        slug: string;
        type: string;
        enabled?: boolean;
        disabled?: boolean;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const validTypes: AttributeType[] = ["TEXT", "NUMBER", "SINGLE_SELECT", "MULTI_SELECT"];
          const typeUpper = options.type.toUpperCase() as AttributeType;
          if (!validTypes.includes(typeUpper)) {
            throw new Error(
              `Invalid type "${options.type}". Must be one of: ${validTypes.join(", ")}`
            );
          }

          const body: CreateOrganizationAttributeInput = {
            name: options.name,
            slug: options.slug,
            type: typeUpper,
            options: [],
          };

          if (options.disabled) {
            body.enabled = false;
          } else if (options.enabled !== undefined) {
            body.enabled = options.enabled;
          }

          const { data: response } = await createAttribute({
            path: { orgId },
            body,
            headers: authHeader(),
          });

          renderAttributeCreated(response?.data, options);
        });
      }
    );

  attributesCmd
    .command("update <attributeId>")
    .description("Update an organization attribute")
    .option("--name <name>", "Attribute name")
    .option("--slug <slug>", "Attribute slug")
    .option("--type <type>", "Attribute type (TEXT, NUMBER, SINGLE_SELECT, MULTI_SELECT)")
    .option("--enabled", "Enable the attribute")
    .option("--disabled", "Disable the attribute")
    .option("--json", "Output as JSON")
    .action(
      async (
        attributeId: string,
        options: {
          name?: string;
          slug?: string;
          type?: string;
          enabled?: boolean;
          disabled?: boolean;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const body: UpdateOrganizationAttributeInput = {};

          if (options.name) body.name = options.name;
          if (options.slug) body.slug = options.slug;
          if (options.type) {
            const validTypes: AttributeType[] = [
              "TEXT",
              "NUMBER",
              "SINGLE_SELECT",
              "MULTI_SELECT",
            ];
            const typeUpper = options.type.toUpperCase() as AttributeType;
            if (!validTypes.includes(typeUpper)) {
              throw new Error(
                `Invalid type "${options.type}". Must be one of: ${validTypes.join(", ")}`
              );
            }
            body.type = typeUpper;
          }
          if (options.disabled) {
            body.enabled = false;
          } else if (options.enabled) {
            body.enabled = true;
          }

          const { data: response } = await updateAttribute({
            path: { orgId, attributeId },
            body,
            headers: authHeader(),
          });

          renderAttributeUpdated(response?.data, options);
        });
      }
    );

  attributesCmd
    .command("delete <attributeId>")
    .description("Delete an organization attribute")
    .option("--json", "Output as JSON")
    .action(async (attributeId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await deleteAttribute({
          path: { orgId, attributeId },
          headers: authHeader(),
        });

        renderAttributeDeleted(response?.data, attributeId, options);
      });
    });
}

function registerOptionsCommands(attributesCmd: Command): void {
  const optionsCmd = attributesCmd.command("options").description("Manage attribute options");

  optionsCmd
    .command("list <attributeId>")
    .description("List all options for an attribute")
    .option("--json", "Output as JSON")
    .action(async (attributeId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getOptions({
          path: { orgId, attributeId },
          headers: authHeader(),
        });

        renderOptionList(response?.data, attributeId, options);
      });
    });

  optionsCmd
    .command("create <attributeId>")
    .description("Create an option for an attribute")
    .requiredOption("--value <value>", "Option value")
    .requiredOption("--slug <slug>", "Option slug")
    .option("--json", "Output as JSON")
    .action(
      async (
        attributeId: string,
        options: {
          value: string;
          slug: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const body: CreateOrganizationAttributeOptionInput = {
            value: options.value,
            slug: options.slug,
          };

          const { data: response } = await createOption({
            path: { orgId, attributeId },
            body,
            headers: authHeader(),
          });

          renderOptionCreated(response?.data, options);
        });
      }
    );

  optionsCmd
    .command("update <attributeId> <optionId>")
    .description("Update an attribute option")
    .option("--value <value>", "Option value")
    .option("--slug <slug>", "Option slug")
    .option("--json", "Output as JSON")
    .action(
      async (
        attributeId: string,
        optionId: string,
        options: {
          value?: string;
          slug?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const body: UpdateOrganizationAttributeOptionInput = {};

          if (options.value) body.value = options.value;
          if (options.slug) body.slug = options.slug;

          const { data: response } = await updateOption({
            path: { orgId, attributeId, optionId },
            body,
            headers: authHeader(),
          });

          renderOptionUpdated(response?.data, options);
        });
      }
    );

  optionsCmd
    .command("delete <attributeId> <optionId>")
    .description("Delete an attribute option")
    .option("--json", "Output as JSON")
    .action(async (attributeId: string, optionId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await deleteOption({
          path: { orgId, attributeId, optionId },
          headers: authHeader(),
        });

        renderOptionDeleted(response?.data, optionId, options);
      });
    });
}

function registerUserOptionsCommands(attributesCmd: Command): void {
  attributesCmd
    .command("user-options <userId>")
    .description("Get all attribute options assigned to a user")
    .option("--json", "Output as JSON")
    .action(async (userId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();
        const userIdNum = parseInt(userId, 10);

        if (isNaN(userIdNum)) {
          throw new Error("userId must be a valid number");
        }

        const { data: response } = await getUserOptions({
          path: { orgId, userId: userIdNum },
          headers: authHeader(),
        });

        renderUserOptions(response?.data, userIdNum, options);
      });
    });

  attributesCmd
    .command("assign <userId>")
    .description("Assign an attribute option to a user")
    .requiredOption("--attribute-id <attributeId>", "Attribute ID")
    .option("--option-id <optionId>", "Option ID to assign")
    .option("--value <value>", "Value to assign (for TEXT/NUMBER attributes)")
    .option("--json", "Output as JSON")
    .action(
      async (
        userId: string,
        options: {
          attributeId: string;
          optionId?: string;
          value?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();
          const userIdNum = parseInt(userId, 10);

          if (isNaN(userIdNum)) {
            throw new Error("userId must be a valid number");
          }

          const body: AssignOrganizationAttributeOptionToUserInput = {
            attributeId: options.attributeId,
          };

          if (options.optionId) {
            body.attributeOptionId = options.optionId;
          }
          if (options.value) {
            body.value = options.value;
          }

          const { data: response } = await assignOptionToUser({
            path: { orgId, userId: userIdNum },
            body,
            headers: authHeader(),
          });

          renderOptionAssigned(response?.data, userIdNum, options);
        });
      }
    );

  attributesCmd
    .command("unassign <userId> <optionId>")
    .description("Unassign an attribute option from a user")
    .option("--json", "Output as JSON")
    .action(async (userId: string, optionId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();
        const userIdNum = parseInt(userId, 10);

        if (isNaN(userIdNum)) {
          throw new Error("userId must be a valid number");
        }

        const { data: response } = await unassignOptionFromUser({
          path: { orgId, userId: userIdNum, attributeOptionId: optionId },
          headers: authHeader(),
        });

        renderOptionUnassigned(response?.data, userIdNum, optionId, options);
      });
    });
}

export function registerOrgAttributesCommand(program: Command): void {
  const attributesCmd = program
    .command("org-attributes")
    .description("Manage organization attributes and their options");
  registerAttributeQueryCommands(attributesCmd);
  registerAttributeMutationCommands(attributesCmd);
  registerOptionsCommands(attributesCmd);
  registerUserOptionsCommands(attributesCmd);
}
