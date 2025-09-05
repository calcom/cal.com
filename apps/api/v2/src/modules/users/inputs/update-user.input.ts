import { PartialType } from "@nestjs/mapped-types";
import { CreateUserInput } from "@/modules/users/inputs/create-user.input";

export class UpdateUserInput extends PartialType(CreateUserInput) {}
