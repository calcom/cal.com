import { UsersRepository, UserWithProfile } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";
import { User } from "@calcom/prisma/client";
import Ajv from "ajv";
import userResponseSchema from "../schemas/userResponseSchema.json" assert { type: "json" };

const ajv = new Ajv();
const validateUserResponse = ajv.compile(userResponseSchema as any);

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getByUsernames(usernames: string[]) {
    const users = await Promise.all(
      usernames.map((username) => this.usersRepository.findByUsername(username))
    );
    const usersFiltered: User[] = [];

    for (const user of users) {
      if (user) {
        usersFiltered.push(user);
      }
    }

    // Validate each user response
    usersFiltered.forEach((user) => {
      if (!validateUserResponse(user)) {
        throw new Error("Invalid user response schema");
      }
    });

    return usersFiltered;
  }

  getUserMainProfile(user: UserWithProfile) {
    return (
      user?.movedToProfile ||
      user.profiles?.find((p) => p.organizationId === user.organizationId) ||
      user.profiles?.[0]
    );
  }

  getUserMainOrgId(user: UserWithProfile) {
    return this.getUserMainProfile(user)?.organizationId ?? user.organizationId;
  }

  getUserProfileByOrgId(user: UserWithProfile, organizationId: number) {
    return user.profiles?.find((p) => p.organizationId === organizationId);
  }
}
