import type { Command } from "commander";
import {
  organizationsRolesPermissionsControllerAddPermissions as addPermissions,
  organizationsRolesControllerCreateRole as createRole,
  organizationsRolesControllerDeleteRole as deleteRole,
  organizationsRolesControllerGetAllRoles as getAllRoles,
  meControllerGetMe as getMe,
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

async function getOrgId(): Promise<number> {
  const { data: response } = await getMe({ headers: authHeader() });
  const me = response?.data;

  if (!me) {
    throw new Error("Could not fetch your profile. Are you logged in?");
  }
  if (!me.organizationId) {
    throw new Error(
      "Organization roles require an organization. Your account does not belong to an organization."
    );
  }

  return me.organizationId;
}

function registerRoleQueryCommands(rolesCmd: Command): void {
  rolesCmd
    .command("list")
    .description("List all organization roles")
    .option("--json", "Output as JSON")
    .action(async (options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

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
    .option("--json", "Output as JSON")
    .action(async (roleId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

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
    .requiredOption("--name <name>", "Role name")
    .option("--description <description>", "Role description")
    .option("--color <color>", "Role color (hex code)")
    .option("--permissions <permissions>", "Comma-separated list of permissions (format: resource.action)")
    .option("--json", "Output as JSON")
    .action(
      async (options: {
        name: string;
        description?: string;
        color?: string;
        permissions?: string;
        json?: boolean;
      }) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

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
    .option("--name <name>", "Role name")
    .option("--description <description>", "Role description")
    .option("--color <color>", "Role color (hex code)")
    .option("--permissions <permissions>", "Comma-separated list of permissions (replaces all)")
    .option("--json", "Output as JSON")
    .action(
      async (
        roleId: string,
        options: {
          name?: string;
          description?: string;
          color?: string;
          permissions?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

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
    .option("--json", "Output as JSON")
    .action(async (roleId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

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
    .option("--json", "Output as JSON")
    .action(async (roleId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

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
    .requiredOption(
      "--permissions <permissions>",
      "Comma-separated list of permissions to add (format: resource.action)"
    )
    .option("--json", "Output as JSON")
    .action(
      async (
        roleId: string,
        options: {
          permissions: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

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
    .requiredOption("--permissions <permissions>", "Comma-separated list of permissions (replaces all)")
    .option("--json", "Output as JSON")
    .action(
      async (
        roleId: string,
        options: {
          permissions: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

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
    .requiredOption("--permissions <permissions>", "Comma-separated list of permissions to remove")
    .option("--json", "Output as JSON")
    .action(
      async (
        roleId: string,
        options: {
          permissions: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

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
