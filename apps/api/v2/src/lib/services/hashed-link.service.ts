import { HashedLinkService as BaseHashedLinkService } from "@calcom/platform-libraries/private-links";
import { Injectable } from "@nestjs/common";

@Injectable()
export class HashedLinkService extends BaseHashedLinkService {
  constructor() {
    super();
  }
}
