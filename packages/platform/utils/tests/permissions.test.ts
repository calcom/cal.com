import {
  BOOKING_READ,
  BOOKING_WRITE,
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  SCHEDULE_READ,
  SCHEDULE_WRITE,
} from "@calcom/platform-constants";
import { hasPermission, hasPermissions, listPermissions } from "../permissions";

describe("Permissions Function: hasPermission", () => {
  let userPermissions: number;
  beforeEach(() => {
    userPermissions = 0;
  });
  it("it should return true if user has the permission", () => {
    userPermissions |= EVENT_TYPE_READ;
    userPermissions |= SCHEDULE_READ;
    const result = hasPermission(userPermissions, EVENT_TYPE_READ);
    expect(result).toEqual(true);
  });

  it("it should return false if user does not have the permission", () => {
    userPermissions |= EVENT_TYPE_READ;
    userPermissions |= SCHEDULE_READ;
    const result = hasPermission(userPermissions, BOOKING_WRITE);
    expect(result).toEqual(false);
  });

  it("it should return false if user does not have the permission", () => {
    userPermissions |= EVENT_TYPE_READ;
    userPermissions |= SCHEDULE_READ;
    const result = hasPermission(userPermissions, SCHEDULE_WRITE);
    expect(result).toEqual(false);
  });
});

describe("Permissions Function: hasPermissions", () => {
  let userPermissions: number;
  beforeEach(() => {
    userPermissions = 0;
  });
  it("it should return true if user has all the permissions", () => {
    userPermissions |= EVENT_TYPE_READ;
    userPermissions |= SCHEDULE_READ;
    const result = hasPermissions(userPermissions, [EVENT_TYPE_READ, SCHEDULE_READ]);
    expect(result).toEqual(true);
  });

  it("it should return false if user does not have all the permissions", () => {
    userPermissions |= EVENT_TYPE_READ;
    userPermissions |= SCHEDULE_READ;
    const result = hasPermissions(userPermissions, [BOOKING_WRITE, SCHEDULE_READ, EVENT_TYPE_READ]);
    expect(result).toEqual(false);
  });

  it("it should return false if user does not have all permissions", () => {
    userPermissions |= EVENT_TYPE_READ;
    userPermissions |= SCHEDULE_READ;
    const result = hasPermissions(userPermissions, [SCHEDULE_WRITE, SCHEDULE_READ]);
    expect(result).toEqual(false);
  });
});

describe("Permissions Function: listPermission", () => {
  let userPermissions: number;
  beforeEach(() => {
    userPermissions = 0;
  });
  it("it should return the list of permissions a user has", () => {
    userPermissions |= EVENT_TYPE_READ;
    userPermissions |= SCHEDULE_READ;
    const result = listPermissions(userPermissions);
    const shouldContainPermissions = [EVENT_TYPE_READ, SCHEDULE_READ];
    const shouldNotContainPermissions = [SCHEDULE_WRITE, EVENT_TYPE_WRITE, BOOKING_READ, BOOKING_WRITE];
    shouldContainPermissions.forEach((permission) => expect(result).toContain(permission));
    shouldNotContainPermissions.forEach((permission) => expect(result).not.toContain(permission));
  });
  it("it should return the list of permissions a user has", () => {
    userPermissions |= EVENT_TYPE_READ;
    userPermissions |= SCHEDULE_READ;
    userPermissions |= BOOKING_WRITE;
    userPermissions |= BOOKING_READ;
    const result = listPermissions(userPermissions);
    const shouldContainPermissions = [EVENT_TYPE_READ, SCHEDULE_READ, BOOKING_WRITE, BOOKING_READ];
    const shouldNotContainPermissions = [SCHEDULE_WRITE, EVENT_TYPE_WRITE];
    shouldContainPermissions.forEach((permission) => expect(result).toContain(permission));
    shouldNotContainPermissions.forEach((permission) => expect(result).not.toContain(permission));
  });
});
