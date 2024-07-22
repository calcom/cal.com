import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

import { User } from "@calcom/prisma/client";

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

    return users;
  }
}
