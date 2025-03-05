import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { OrganizationsDwdRepository } from "@/modules/organizations/dwd/organizations-dwd.repository";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import {
  SelectedCalendarsInputDto,
  SelectedCalendarsQueryParamsInputDto,
} from "@/modules/selected-calendars/inputs/selected-calendars.input";
import { SelectedCalendarsRepository } from "@/modules/selected-calendars/selected-calendars.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

import { SelectedCalendarRepository } from "@calcom/platform-libraries";

type SelectedCalendarsInputDwd = SelectedCalendarsInputDto & { domainWideDelegationCredentialId: string };

@Injectable()
export class SelectedCalendarsService {
  constructor(
    private readonly calendarsService: CalendarsService,
    private readonly selectedCalendarsRepository: SelectedCalendarsRepository,
    private readonly organizationsMembershipService: OrganizationsMembershipService,
    private readonly organizationsDwdRepository: OrganizationsDwdRepository
  ) {}

  async addSelectedCalendar(user: UserWithProfile, input: SelectedCalendarsInputDto) {
    if (input.domainWideDelegationCredentialId) {
      const dwdInput = {
        ...input,
        domainWideDelegationCredentialId: input.domainWideDelegationCredentialId,
      };
      return this.addSelectedCalendarDwd(user, dwdInput);
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

  private async addSelectedCalendarDwd(user: UserWithProfile, selectedCalendar: SelectedCalendarsInputDwd) {
    const isMemberOfOrganization = await this.isMemberOfDwdOrganization(
      user.id,
      selectedCalendar.domainWideDelegationCredentialId
    );
    if (!isMemberOfOrganization) {
      throw new NotFoundException("User is not a member of the organization that owns the DWD credential");
    }

    const { integration, externalId, credentialId, domainWideDelegationCredentialId } = selectedCalendar;
    const dwdSelectedCalendar = await SelectedCalendarRepository.upsert({
      userId: user.id,
      integration,
      externalId,
      credentialId,
      domainWideDelegationCredentialId,
      eventTypeId: null,
    });
    return dwdSelectedCalendar;
  }

  private async isMemberOfDwdOrganization(userId: number, domainWideDelegationCredentialId: string) {
    const dwd = await this.organizationsDwdRepository.findById(domainWideDelegationCredentialId);
    if (!dwd) {
      throw new NotFoundException("DWD with provided domainWideDelegationCredentialId not found");
    }

    const isMemberOfOrganization = await this.organizationsMembershipService.getOrgMembershipByUserId(
      dwd.organizationId,
      userId
    );

    return isMemberOfOrganization;
  }

  async deleteSelectedCalendar(
    selectedCalendar: SelectedCalendarsQueryParamsInputDto,
    user: UserWithProfile
  ) {
    const { integration, externalId, credentialId, domainWideDelegationCredentialId } = selectedCalendar;

    if (!domainWideDelegationCredentialId) {
      await this.calendarsService.checkCalendarCredentials(Number(credentialId), user.id);
    } else {
      const isMemberOfOrganization = await this.isMemberOfDwdOrganization(
        user.id,
        domainWideDelegationCredentialId
      );
      if (!isMemberOfOrganization) {
        throw new NotFoundException("User is not a member of the organization that owns the DWD credential");
      }
    }

    const removedCalendarEntry = await this.selectedCalendarsRepository.removeUserSelectedCalendar(
      user.id,
      integration,
      externalId,
      domainWideDelegationCredentialId
    );

    return removedCalendarEntry;
  }
}
