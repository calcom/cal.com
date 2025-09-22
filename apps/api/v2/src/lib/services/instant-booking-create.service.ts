import { Injectable } from "@nestjs/common";

import { InstantBookingCreateService as BaseInstantBookingCreateService } from "@calcom/features/instant-meeting/handleInstantMeeting";

@Injectable()
export class InstantBookingCreateService extends BaseInstantBookingCreateService {}
