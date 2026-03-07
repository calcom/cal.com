import type {
  GetBookingsOutput_2024_08_13,
  OrganizationsBookingsControllerGetAllOrgTeamBookingsResponse,
  OrganizationsUsersBookingsControllerGetOrganizationUserBookingsResponse,
} from "../../generated/types.gen";

export type OrgBooking = GetBookingsOutput_2024_08_13["data"][number];
export type OrgBookingList = GetBookingsOutput_2024_08_13["data"];
export type OrgBookingsResponse = OrganizationsBookingsControllerGetAllOrgTeamBookingsResponse;
export type OrgUserBookingsResponse = OrganizationsUsersBookingsControllerGetOrganizationUserBookingsResponse;
export type BookingStatus = "upcoming" | "past" | "cancelled" | "recurring" | "unconfirmed";
export type SortOrder = "asc" | "desc";
