import { OutputUsersService } from "@/modules/users/controllers/users-outputs.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import { User } from "@calcom/prisma/client";

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersOutputService: OutputUsersService
  ) {}

  async getByUsernames(usernames: string) {
    const individualUsernames = usernames.split("+");
    const users = await Promise.all(
      individualUsernames.map((username) => this.usersRepository.findByUsername(username))
    );
    const usersFiltered: User[] = [];

    for (const user of users) {
      if (user) {
        usersFiltered.push(user);
      }
    }

    return this.usersOutputService.getResponseUsers(usersFiltered);
  }
}
