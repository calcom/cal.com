import { SubjectType } from "./SubjectType";

export interface UserSubject {
  readonly type: typeof SubjectType.User;
  readonly user: {
    readonly id: number;
  };
}
