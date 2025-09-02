export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

// // Extend Fastify types
// declare module "@fastify/jwt" {
//   interface FastifyJWT {
//     payload: JwtPayload;
//     user: AuthUser;
//   }
// }

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}
