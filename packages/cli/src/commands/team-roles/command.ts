import type { Command } from "commander";
import {
  organizationsTeamsRolesPermissionsControllerAddPermissions as addPermissions,
  organizationsTeamsRolesControllerCreateRole as createRole,
  organizationsTeamsRolesControllerDeleteRole as deleteRole,
  organizationsTeamsRolesControllerGetAllRoles as getAllRoles,
  meControllerGetMe as getMe,
  organizationsTeamsRolesControllerGetRole as getRole,
  organizationsTeamsRolesPermissionsControllerListPermissions as listPermissions,
  organizationsTeamsRolesPermissionsControllerRemovePermissions as removePermissions,
  organizationsTeamsRolesPermissionsControllerSetPermissions as setPermissions,
  organizationsTeamsRolesControllerUpdateRole as updateRole,
} from "../../generated/sdk.gen";
import type {
  CreateTeamRoleInput,
  CreateTeamRolePermissionsInput,
  UpdateTeamRoleInput,
} from "../../generated/types.gen";
import { initializeClient } from "../../shared/client";
import { withErrorHandling } from "../../shared/errors";
import { authHeader } from "../../shared/headers";

type PermissionValue = CreateTeamRolePermissionsInput["permissions"][number];

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
      "Team roles require an organization. Your account does not belong to an organization."
    );
  }

  return me.organizationId;
}

function registerRoleQueryCommands(rolesCmd: Command): void {
  rolesCmd
    .command("list <teamId>")
    .description("List all team roles")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getAllRoles({
          path: { orgId, teamId: parseInt(teamId, 10) },
          headers: authHeader(),
        });

        renderRoleList(response?.data, options);
      });
    });

  rolesCmd
    .command("get <teamId> <roleId>")
    .description("Get a role by ID")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, roleId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await getRole({
          path: { orgId, teamId: parseInt(teamId, 10), roleId },
          headers: authHeader(),
        });

        renderRole(response?.data, options);
      });
    });
}

function registerRoleMutationCommands(rolesCmd: Command): void {
  rolesCmd
    .command("create <teamId>")
    .description("Create a new team role")
    .requiredOption("--name <name>", "Role name")
    .option("--description <description>", "Role description")
    .option("--color <color>", "Role color (hex code)")
    .option("--permissions <permissions>", "Comma-separated list of permissions (format: resource.action)")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
        options: {
          name: string;
          description?: string;
          color?: string;
          permissions?: string;
          json?: boolean;
        }
      ) => {
        await withErrorHandling(async () => {
          await initializeClient();
          const orgId = await getOrgId();

          const body: CreateTeamRoleInput = {
            name: options.name,
          };

          if (options.description) body.description = options.description;
          if (options.color) body.color = options.color;
          if (options.permissions) {
            body.permissions = options.permissions.split(",").map((p) => p.trim() as PermissionValue);
          }

          const { data: response } = await createRole({
            path: { orgId, teamId: parseInt(teamId, 10) },
            body,
            headers: authHeader(),
          });

          renderRoleCreated(response?.data, options);
        });
      }
    );

  rolesCmd
    .command("update <teamId> <roleId>")
    .description("Update a team role")
    .option("--name <name>", "Role name")
    .option("--description <description>", "Role description")
    .option("--color <color>", "Role color (hex code)")
    .option("--permissions <permissions>", "Comma-separated list of permissions (replaces all)")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
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

          const body: UpdateTeamRoleInput = {};

          if (options.name) body.name = options.name;
          if (options.description) body.description = options.description;
          if (options.color) body.color = options.color;
          if (options.permissions) {
            body.permissions = options.permissions.split(",").map((p) => p.trim() as PermissionValue);
          }

          const { data: response } = await updateRole({
            path: { orgId, teamId: parseInt(teamId, 10), roleId },
            body,
            headers: authHeader(),
          });

          renderRoleUpdated(response?.data, options);
        });
      }
    );

  rolesCmd
    .command("delete <teamId> <roleId>")
    .description("Delete a team role")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, roleId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await deleteRole({
          path: { orgId, teamId: parseInt(teamId, 10), roleId },
          headers: authHeader(),
        });

        renderRoleDeleted(response?.data, roleId, options);
      });
    });
}

function registerPermissionsCommands(rolesCmd: Command): void {
  const permissionsCmd = rolesCmd.command("permissions").description("Manage team role permissions");

  permissionsCmd
    .command("list <teamId> <roleId>")
    .description("List permissions for a role")
    .option("--json", "Output as JSON")
    .action(async (teamId: string, roleId: string, options: { json?: boolean }) => {
      await withErrorHandling(async () => {
        await initializeClient();
        const orgId = await getOrgId();

        const { data: response } = await listPermissions({
          path: { orgId, teamId: parseInt(teamId, 10), roleId },
          headers: authHeader(),
        });

        renderPermissionsList(response?.data, roleId, options);
      });
    });

  permissionsCmd
    .command("add <teamId> <roleId>")
    .description("Add permissions to a role")
    .requiredOption(
      "--permissions <permissions>",
      "Comma-separated list of permissions to add (format: resource.action)"
    )
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
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
            path: { orgId, teamId: parseInt(teamId, 10), roleId },
            body: { permissions },
            headers: authHeader(),
          });

          renderPermissionsAdded(response?.data, options);
        });
      }
    );

  permissionsCmd
    .command("set <teamId> <roleId>")
    .description("Replace all permissions for a role")
    .requiredOption("--permissions <permissions>", "Comma-separated list of permissions (replaces all)")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
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
            path: { orgId, teamId: parseInt(teamId, 10), roleId },
            body: { permissions },
            headers: authHeader(),
          });

          renderPermissionsSet(response?.data, options);
        });
      }
    );

  permissionsCmd
    .command("remove <teamId> <roleId>")
    .description("Remove permissions from a role")
    .requiredOption("--permissions <permissions>", "Comma-separated list of permissions to remove")
    .option("--json", "Output as JSON")
    .action(
      async (
        teamId: string,
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
            path: { orgId, teamId: parseInt(teamId, 10), roleId },
            query: { permissions },
            headers: authHeader(),
          });

          renderPermissionsRemoved(roleId, options);
        });
      }
    );
}

export function registerTeamRolesCommand(program: Command): void {
  const rolesCmd = program.command("team-roles").description("Manage team roles and permissions");
  registerRoleQueryCommands(rolesCmd);
  registerRoleMutationCommands(rolesCmd);
  registerPermissionsCommands(rolesCmd);
}
