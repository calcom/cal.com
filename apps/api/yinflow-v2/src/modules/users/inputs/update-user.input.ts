import { PartialType } from "@nestjs/mapped-types";

import { CreateUserInput } from "../../users/inputs/create-user.input";

export class UpdateUserInput extends PartialType(CreateUserInput) {}
