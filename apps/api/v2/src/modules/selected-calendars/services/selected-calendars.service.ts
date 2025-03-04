import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { OrganizationsDelegationCredentialRepository } from "@/modules/organizations/delegation-credentials/organizations-delegation-credential.repository";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import {
  SelectedCalendarsInputDto,
  SelectedCalendarsQueryParamsInputDto,
} from "@/modules/selected-calendars/inputs/selected-calendars.input";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

import { SelectedCalendarRepository } from "@calcom/platform-libraries";

type SelectedCalendarsInputDelegationCredential = SelectedCalendarsInputDto & {
  delegationCredentialId: string;
};

@Injectable()
export class SelectedCalendarsService {
  constructor(
    private readonly calendarsService: CalendarsService,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly organizationsMembershipService: OrganizationsMembershipService,
    private readonly organizationsDelegationCredentialRepository: OrganizationsDelegationCredentialRepository
  ) {}

  async addSelectedCalendar(user: UserWithProfile, input: SelectedCalendarsInputDto) {
    if (input.delegationCredentialId) {
      const delegationCredentialInput = {
        ...input,
        delegationCredentialId: input.delegationCredentialId,
      };
      return this.addSelectedCalendarDelegationCredential(user, delegationCredentialInput);
    }
    return this.addSelectedCalendarUser(user, input);
  }

  private async addSelectedCalendarUser(user: UserWithProfile, selectedCalendar: SelectedCalendarsInputDto) {
    const { integration, externalId, credentialId } = selectedCalendar;
    await this.calendarsService.checkCalendarCredentials(Number(credentialId), user.id);

    const userSelectedCalendar = await this.selectedCalendarsRepository.addUserSelectedCalendar(
      user.id,
      integration,
      externalId,
      credentialId
    );

    return userSelectedCalendar;
  }

  private async addSelectedCalendarDelegationCredential(
    user: UserWithProfile,
    selectedCalendar: SelectedCalendarsInputDelegationCredential
  ) {
    const isMemberOfOrganization = await this.isMemberOfDelegationCredentialOrganization(
      user.id,
      selectedCalendar.delegationCredentialId
    );
    if (!isMemberOfOrganization) {
      throw new NotFoundException(
        "User is not a member of the organization that owns the Delegation credential"
      );
    }

    const { integration, externalId, credentialId, delegationCredentialId } = selectedCalendar;
    const delegationCredentialSelectedCalendar = await SelectedCalendarRepository.upsert({
      userId: user.id,
      integration,
      externalId,
      credentialId,
      delegationCredentialId,
      eventTypeId: null,
    });
    return delegationCredentialSelectedCalendar;
  }

  private async isMemberOfDelegationCredentialOrganization(userId: number, delegationCredentialId: string) {
    const delegationCredential = await this.organizationsDelegationCredentialRepository.findById(
      delegationCredentialId
    );
    if (!delegationCredential) {
      throw new NotFoundException("DelegationCredential with provided delegationCredentialId not found");
    }

    const isMemberOfOrganization = await this.organizationsMembershipService.getOrgMembershipByUserId(
      delegationCredential.organizationId,
      userId
    );

    return isMemberOfOrganization;
  }

  async deleteSelectedCalendar(
    selectedCalendar: SelectedCalendarsQueryParamsInputDto,
    user: UserWithProfile
  ) {
    const { integration, externalId, credentialId, delegationCredentialId } = selectedCalendar;

    if (!delegationCredentialId) {
      await this.calendarsService.checkCalendarCredentials(Number(credentialId), user.id);
    } else {
      const isMemberOfOrganization = await this.isMemberOfDelegationCredentialOrganization(
        user.id,
        delegationCredentialId
      );
      if (!isMemberOfOrganization) {
        throw new NotFoundException(
          "User is not a member of the organization that owns the Delegation credential"
        );
      }
    }

    const removedCalendarEntry = await this.selectedCalendarsRepository.removeUserSelectedCalendar(
      user.id,
      integration,
      externalId,
      delegationCredentialId
    );

    return removedCalendarEntry;
  }
}
