import { IsArray } from "class-validator";

export interface User {
  id: number;
  name: string | null;
  email: string;
  timeZone: string;
  role: string;
}

export class ListUsersResponseDto {
  @IsArray()
  users!: User[];
}
