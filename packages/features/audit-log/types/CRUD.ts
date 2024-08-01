export const CRUD = {
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
} as const;

export type CRUD = (typeof CRUD)[keyof typeof CRUD];
