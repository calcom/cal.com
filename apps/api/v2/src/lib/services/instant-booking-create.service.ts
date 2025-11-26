import { Injectable } from "@nestjs/common";

import { InstantBookingCreateService as BaseInstantBookingCreateService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class InstantBookingCreateService extends BaseInstantBookingCreateService {}
