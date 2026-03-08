import type { Command } from "commander";
import {
  organizationsAttributesOptionsControllerAssignOrganizationAttributeOptionToUser as assignOptionToUser,
  organizationsAttributesControllerCreateOrganizationAttribute as createAttribute,
  organizationsAttributesOptionsControllerCreateOrganizationAttributeOption as createOption,
  organizationsAttributesControllerDeleteOrganizationAttribute as deleteAttribute,
  organizationsAttributesOptionsControllerDeleteOrganizationAttributeOption as deleteOption,
  organizationsAttributesOptionsControllerGetOrganizationAttributeAssignedOptions as getAssignedOptions,
  organizationsAttributesOptionsControllerGetOrganizationAttributeAssignedOptionsBySlug as getAssignedOptionsBySlug,
  organizationsAttributesControllerGetOrganizationAttribute as getAttribute,
  organizationsAttributesControllerGetOrganizationAttributes as getAttributes,
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
  renderAssignedOptions,
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

function registerAttributeQueryCommands(attributesCmd: Command): void {
  attributesCmd
    .command("list")
    .description("List all organization attributes")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

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
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (attributeId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

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
    .requiredOption("--org-id <orgId>", "Organization ID")
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
      async (options: { orgId: string;
        name: string;
        slug: string;
        type: string;
        enabled?: boolean;
        disabled?: boolean;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

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
    .requiredOption("--org-id <orgId>", "Organization ID")
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
          orgId: string;
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
          const orgId = Number(options.orgId);

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
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (attributeId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

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
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (attributeId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

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
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--value <value>", "Option value")
    .requiredOption("--slug <slug>", "Option slug")
    .option("--json", "Output as JSON")
    .action(
      async (
        attributeId: string,
        options: {
          orgId: string;
          value: string;
          slug: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

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
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--value <value>", "Option value")
    .option("--slug <slug>", "Option slug")
    .option("--json", "Output as JSON")
    .action(
      async (
        attributeId: string,
        optionId: string,
        options: {
          orgId: string;
          value?: string;
          slug?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

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
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (attributeId: string, optionId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const { data: response } = await deleteOption({
          path: { orgId, attributeId, optionId },
          headers: authHeader(),
        });

        renderOptionDeleted(response?.data, optionId, options);
      });
    });

  optionsCmd
    .command("assigned <attributeId>")
    .description("Get all assigned options for an attribute by ID")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--take <n>", "Number of results to return")
    .option("--skip <n>", "Number of results to skip")
    .option("--json", "Output as JSON")
    .action(
      async (
        attributeId: string,
        options: { orgId: string; take?: string; skip?: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const { data: response } = await getAssignedOptions({
            path: { orgId, attributeId },
            query: {
              take: options.take ? Number(options.take) : undefined,
              skip: options.skip ? Number(options.skip) : undefined,
            },
            headers: authHeader(),
          });

          renderAssignedOptions(response?.data, attributeId, options);
        });
      }
    );

  optionsCmd
    .command("assigned-by-slug <attributeSlug>")
    .description("Get all assigned options for an attribute by slug")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--take <n>", "Number of results to return")
    .option("--skip <n>", "Number of results to skip")
    .option("--json", "Output as JSON")
    .action(
      async (
        attributeSlug: string,
        options: { orgId: string; take?: string; skip?: string; json?: boolean }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const { data: response } = await getAssignedOptionsBySlug({
            path: { orgId, attributeSlug },
            query: {
              take: options.take ? Number(options.take) : undefined,
              skip: options.skip ? Number(options.skip) : undefined,
            },
            headers: authHeader(),
          });

          renderAssignedOptions(response?.data, attributeSlug, options);
        });
      }
    );
}

function registerUserOptionsCommands(attributesCmd: Command): void {
  attributesCmd
    .command("user-options <userId>")
    .description("Get all attribute options assigned to a user")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (userId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);
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
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--attribute-id <attributeId>", "Attribute ID")
    .option("--option-id <optionId>", "Option ID to assign")
    .option("--value <value>", "Value to assign (for TEXT/NUMBER attributes)")
    .option("--json", "Output as JSON")
    .action(
      async (
        userId: string,
        options: {
          orgId: string;
          attributeId: string;
          optionId?: string;
          value?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);
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
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (userId: string, optionId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);
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
