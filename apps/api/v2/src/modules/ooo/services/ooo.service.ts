import {
  CreateOutOfOfficeEntryDto,
  UpdateOutOfOfficeEntryDto,
  OutOfOfficeReason,
} from "@/modules/ooo/inputs/ooo.input";
import { UserOOORepository } from "@/modules/ooo/repositories/ooo.repository";
import { Injectable } from "@nestjs/common";

import { OutOfOfficeEntry } from "@calcom/prisma/client";

const OOO_REASON_ID_TO_REASON = {
  1: OutOfOfficeReason["UNSPECIFIED"],
  2: OutOfOfficeReason["VACATION"],
  3: OutOfOfficeReason["TRAVEL"],
  4: OutOfOfficeReason["SICK_LEAVE"],
  5: OutOfOfficeReason["PUBLIC_HOLIDAY"],
};

const OOO_REASON_TO_REASON_ID = {
  [OutOfOfficeReason["UNSPECIFIED"]]: 1,
  [OutOfOfficeReason["VACATION"]]: 2,
  [OutOfOfficeReason["TRAVEL"]]: 3,
  [OutOfOfficeReason["SICK_LEAVE"]]: 4,
  [OutOfOfficeReason["PUBLIC_HOLIDAY"]]: 5,
};

@Injectable()
export class UserOOOService {
  constructor(private readonly oooRepository: UserOOORepository) {}

  formatOooReason(ooo: OutOfOfficeEntry) {
    return {
      ...ooo,
      reason: ooo.reasonId
        ? OOO_REASON_ID_TO_REASON[ooo.reasonId as keyof typeof OOO_REASON_ID_TO_REASON]
        : OOO_REASON_ID_TO_REASON[1],
    };
  }

  async createUserOOO(userId: number, body: CreateOutOfOfficeEntryDto) {
    const { reason, ...rest } = body;
    const ooo = await this.oooRepository.createUserOOO({
      ...rest,
      userId,
      reasonId: OOO_REASON_TO_REASON_ID[reason ?? OutOfOfficeReason["UNSPECIFIED"]],
    });
    return this.formatOooReason(ooo);
  }

  async updateUserOOO(oooId: number, body: UpdateOutOfOfficeEntryDto) {
    const { reason, ...rest } = body;
    const data = reason
      ? { ...rest, reasonId: OOO_REASON_TO_REASON_ID[reason ?? OutOfOfficeReason["UNSPECIFIED"]] }
      : rest;
    const ooo = await this.oooRepository.updateUserOOO(oooId, data);
    return this.formatOooReason(ooo);
  }

  async deleteUserOOO(oooId: number) {
    const ooo = await this.oooRepository.deleteUserOOO(oooId);
    return this.formatOooReason(ooo);
  }

  async getUserOOOPaginated(userId: number, skip: number, take: number) {
    const ooos = await this.oooRepository.getUserOOOPaginated(userId, skip, take);
    return ooos.map((ooo) => this.formatOooReason(ooo));
  }
}
