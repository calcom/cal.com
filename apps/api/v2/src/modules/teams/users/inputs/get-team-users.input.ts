import { GetUsersInput } from "@/modules/users/inputs/get-users.input";

export class GetTeamUsersInput extends GetUsersInput {
  // This class extends GetUsersInput which already has:
  // - emails?: string[] (with proper validation)
  // - take?: number (pagination)
  // - skip?: number (pagination)
}
