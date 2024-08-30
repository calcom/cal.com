import { PartialType } from "@nestjs/mapped-types";
import { CreateUserInput } from "src/modules/users/inputs/create-user.input";

export class UpdateUserInput extends PartialType(CreateUserInput) {}
