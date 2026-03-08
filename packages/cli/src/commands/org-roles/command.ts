import type { Command } from "commander";
import {
  organizationsRolesPermissionsControllerAddPermissions as addPermissions,
  organizationsRolesControllerCreateRole as createRole,
  organizationsRolesControllerDeleteRole as deleteRole,
  organizationsRolesControllerGetAllRoles as getAllRoles,
  organizationsRolesControllerGetRole as getRole,
  organizationsRolesPermissionsControllerListPermissions as listPermissions,
  organizationsRolesPermissionsControllerRemovePermissions as removePermissions,
  organizationsRolesPermissionsControllerSetPermissions as setPermissions,
  organizationsRolesControllerUpdateRole as updateRole,
} from "../../generated/sdk.gen";
import type {
  CreateOrgRoleInput,
  CreateOrgRolePermissionsInput,
  UpdateOrgRoleInput,
} from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";

type PermissionValue = CreateOrgRolePermissionsInput["permissions"][number];

import {
  renderPermissionsAdded,
  renderPermissionsList,
  renderPermissionsRemoved,
  renderPermissionsSet,
  renderRole,
  renderRoleCreated,
  renderRoleDeleted,
  renderRoleList,
  renderRoleUpdated,
} from "./output";

function registerRoleQueryCommands(rolesCmd: Command): void {
  rolesCmd
    .command("list")
    .description("List all organization roles")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const { data: response } = await getAllRoles({
          path: { orgId },
          headers: authHeader(),
        });

        renderRoleList(response?.data, options);
      });
    });

  rolesCmd
    .command("get <roleId>")
    .description("Get a role by ID")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (roleId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const { data: response } = await getRole({
          path: { orgId, roleId },
          headers: authHeader(),
        });

        renderRole(response?.data, options);
      });
    });
}

function registerRoleMutationCommands(rolesCmd: Command): void {
  rolesCmd
    .command("create")
    .description("Create a new organization role")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--name <name>", "Role name")
    .option("--description <description>", "Role description")
    .option("--color <color>", "Role color (hex code)")
    .option("--permissions <permissions>", "Comma-separated list of permissions (format: resource.action)")
    .option("--json", "Output as JSON")
    .action(
      async (options: { orgId: string;
        name: string;
        description?: string;
        color?: string;
        permissions?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const body: CreateOrgRoleInput = {
            name: options.name,
          };

          if (options.description) body.description = options.description;
          if (options.color) body.color = options.color;
          if (options.permissions) {
            body.permissions = options.permissions.split(",").map((p) => p.trim() as PermissionValue);
          }

          const { data: response } = await createRole({
            path: { orgId },
            body,
            headers: authHeader(),
          });

          renderRoleCreated(response?.data, options);
        });
      }
    );

  rolesCmd
    .command("update <roleId>")
    .description("Update an organization role")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--name <name>", "Role name")
    .option("--description <description>", "Role description")
    .option("--color <color>", "Role color (hex code)")
    .option("--permissions <permissions>", "Comma-separated list of permissions (replaces all)")
    .option("--json", "Output as JSON")
    .action(
      async (
        roleId: string,
        options: {
          orgId: string;
          name?: string;
          description?: string;
          color?: string;
          permissions?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const body: UpdateOrgRoleInput = {};

          if (options.name) body.name = options.name;
          if (options.description) body.description = options.description;
          if (options.color) body.color = options.color;
          if (options.permissions) {
            body.permissions = options.permissions.split(",").map((p) => p.trim() as PermissionValue);
          }

          const { data: response } = await updateRole({
            path: { orgId, roleId },
            body,
            headers: authHeader(),
          });

          renderRoleUpdated(response?.data, options);
        });
      }
    );

  rolesCmd
    .command("delete <roleId>")
    .description("Delete an organization role")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (roleId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const { data: response } = await deleteRole({
          path: { orgId, roleId },
          headers: authHeader(),
        });

        renderRoleDeleted(response?.data, roleId, options);
      });
    });
}

function registerPermissionsCommands(rolesCmd: Command): void {
  const permissionsCmd = rolesCmd.command("permissions").description("Manage role permissions");

  permissionsCmd
    .command("list <roleId>")
    .description("List permissions for a role")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .option("--json", "Output as JSON")
    .action(async (roleId: string, options: { orgId: string; json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = Number(options.orgId);

        const { data: response } = await listPermissions({
          path: { orgId, roleId },
          headers: authHeader(),
        });

        renderPermissionsList(response?.data, roleId, options);
      });
    });

  permissionsCmd
    .command("add <roleId>")
    .description("Add permissions to a role")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption(
      "--permissions <permissions>",
      "Comma-separated list of permissions to add (format: resource.action)"
    )
    .option("--json", "Output as JSON")
    .action(
      async (
        roleId: string,
        options: {
          orgId: string;
          permissions: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const permissions = options.permissions.split(",").map((p) => p.trim() as PermissionValue);

          const { data: response } = await addPermissions({
            path: { orgId, roleId },
            body: { permissions },
            headers: authHeader(),
          });

          renderPermissionsAdded(response?.data, options);
        });
      }
    );

  permissionsCmd
    .command("set <roleId>")
    .description("Replace all permissions for a role")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--permissions <permissions>", "Comma-separated list of permissions (replaces all)")
    .option("--json", "Output as JSON")
    .action(
      async (
        roleId: string,
        options: {
          orgId: string;
          permissions: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const permissions = options.permissions.split(",").map((p) => p.trim() as PermissionValue);

          const { data: response } = await setPermissions({
            path: { orgId, roleId },
            body: { permissions },
            headers: authHeader(),
          });

          renderPermissionsSet(response?.data, options);
        });
      }
    );

  permissionsCmd
    .command("remove <roleId>")
    .description("Remove permissions from a role")
    .requiredOption("--org-id <orgId>", "Organization ID")
    .requiredOption("--permissions <permissions>", "Comma-separated list of permissions to remove")
    .option("--json", "Output as JSON")
    .action(
      async (
        roleId: string,
        options: {
          orgId: string;
          permissions: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = Number(options.orgId);

          const permissions = options.permissions.split(",").map((p) => p.trim() as PermissionValue);

          await removePermissions({
            path: { orgId, roleId },
            query: { permissions },
            headers: authHeader(),
          });

          renderPermissionsRemoved(roleId, options);
        });
      }
    );
}

export function registerOrgRolesCommand(program: Command): void {
  const rolesCmd = program.command("org-roles").description("Manage organization roles and permissions");
  registerRoleQueryCommands(rolesCmd);
  registerRoleMutationCommands(rolesCmd);
  registerPermissionsCommands(rolesCmd);
}
