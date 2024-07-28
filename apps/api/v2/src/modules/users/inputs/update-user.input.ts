import { CreateUserInput } from "@/modules/users/inputs/create-user.input";
import { PartialType } from "@nestjs/mapped-types";

export class UpdateUserInput extends PartialType(CreateUserInput) {}
