import { CreateUserInput } from "@/modules/users/inputs/create-user.input";
import { PartialType } from "@nestjs/swagger";

export class UpdateUserInput extends PartialType(CreateUserInput) {}
