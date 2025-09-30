import {
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";

@ValidatorConstraint({ name: "ValidateHostsOrAssignAll" })
export class HostsOrAssignAllValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const { hosts, assignAllTeamMembers } = object;

    // If assignAllTeamMembers is true, hosts array should not be provided
    if (assignAllTeamMembers === true) {
      if (hosts && hosts.length > 0) {
        return false; // Invalid: both assignAllTeamMembers=true and hosts provided
      }
      return true;
    }

    // If assignAllTeamMembers is not true, we have two valid options:
    // 1. No hosts provided (empty array or undefined) - valid for event types without specific hosts
    // 2. Hosts array with valid userIds - for event types with specific hosts

    // If hosts are provided, validate they have valid userIds
    if (hosts && Array.isArray(hosts) && hosts.length > 0) {
      return hosts.every((host: any) => host && typeof host.userId === 'number' && host.userId > 0);
    }

    // Empty or undefined hosts is valid (allows creating event types without hosts)
    return true;
  }

  defaultMessage() {
    return 'When "assignAllTeamMembers" is true, "hosts" array should not be provided. When "assignAllTeamMembers" is false/undefined, "hosts" can be empty or contain valid userIds';
  }
}