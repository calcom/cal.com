import { IncomingMessage } from "http";
import { getSession } from "next-auth/client";
import { Subject } from "./Subject";
import { SubjectType } from "./SubjectType";

declare module "next-auth" {
  interface User {
    readonly id: number;
  }

  interface Session {
    readonly user: User;
  }
}

export class SubjectResolver {
  /**
   * Accepts an incoming request and returns a subject from the session cookie.
   */
  public async resolve(request: IncomingMessage): Promise<Subject> {
    const session = await getSession({ req: request });
    if (!session?.user?.id) {
      return { type: SubjectType.Visitor };
    }
    return {
      type: SubjectType.User,
      user: {
        id: session.user.id,
      },
    };
  }
}
