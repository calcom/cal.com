import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.e2e") });
async function globalTeardown() {
  console.log("Cleaning up managed users...");
  try {
    const oauthClientId = process.env.NEXT_PUBLIC_X_CAL_ID;
    const secretKey = process.env.X_CAL_SECRET_KEY;
    const apiUrl = process.env.NEXT_PUBLIC_CALCOM_API_URL;
    if (!oauthClientId || !secretKey || !apiUrl) {
      console.log("Missing environment variables, skipping managed user cleanup");
      return;
    }
    const getManagedUsersResponse = await fetch(`${apiUrl}/oauth-clients/${oauthClientId}/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-cal-secret-key": secretKey,
        "x-cal-client-id": oauthClientId,
      },
    });
    if (getManagedUsersResponse.ok) {
      const managedUsersData = await getManagedUsersResponse.json();
      const users = managedUsersData.data || [];
      for (const user of users) {
        try {
          const deleteResponse = await fetch(`${apiUrl}/oauth-clients/${oauthClientId}/users/${user.id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "x-cal-secret-key": secretKey,
              "x-cal-client-id": oauthClientId,
            },
          });
          if (deleteResponse.ok) {
            console.log(`Deleted managed user: with id = ${user.id}`);
          } else {
            console.error(`Failed to delete user with id = ${user.id}:`, await deleteResponse.text());
          }
        } catch (error) {
          console.error(`Error deleting user with id = ${user.id}:`, error);
        }
      }
    } else {
      console.error("Failed to fetch managed users:", await getManagedUsersResponse.text());
    }
    const getOAuthClientResponse = await fetch(`${apiUrl}/oauth-clients/${oauthClientId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-cal-secret-key": secretKey,
        "x-cal-client-id": oauthClientId,
      },
    });
    if (getOAuthClientResponse.ok) {
      const oauthClientData = await getOAuthClientResponse.json();
      const organizationId = oauthClientData.data?.organizationId;
      if (organizationId) {
        console.log(`Found organizationId: ${organizationId}`);
        const getTeamsResponse = await fetch(`${apiUrl}/organizations/${organizationId}/teams`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-cal-secret-key": secretKey,
            "x-cal-client-id": oauthClientId,
          },
        });
        if (getTeamsResponse.ok) {
          const teamsData = await getTeamsResponse.json();
          const teams = teamsData.data || [];
          for (const team of teams) {
            try {
              const deleteTeamResponse = await fetch(
                `${apiUrl}/organizations/${organizationId}/teams/${team.id}`,
                {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                    "x-cal-secret-key": secretKey,
                    "x-cal-client-id": oauthClientId,
                  },
                }
              );
              if (deleteTeamResponse.ok) {
                console.log(`Deleted team: ${team.name}`);
              } else {
                console.error(`Failed to delete team ${team.name}:`, await deleteTeamResponse.text());
              }
            } catch (error) {
              console.error(`Error deleting team ${team.name}:`, error);
            }
          }
        } else {
          console.error("Failed to fetch teams:", await getTeamsResponse.text());
        }
      } else {
        console.log("No organizationId found in OAuth client");
      }
    } else {
      console.error("Failed to fetch OAuth client:", await getOAuthClientResponse.text());
    }
  } catch (error) {
    console.error("Failed to clean up:", error);
  } finally {
    console.log("Cleaning up test database...");
    const testDbPath = path.resolve(__dirname, "prisma", "test.db");
    fs.rmSync(testDbPath, { force: true });
    console.log("Test database cleaned up successfully");
  }
}
export default globalTeardown;
