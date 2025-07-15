import { UserWithProfile } from "@/modules/users/usersRepository";

export class BaseStrategy {
  success!: (user: unknown) => void;
  error!: (error: Error) => void;
}

export class NextAuthPassportStrategy {
  success!: (user: UserWithProfile) => void;
  error!: (error: Error) => void;
}
