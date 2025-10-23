import { Injectable } from "@nestjs/common";

import { HashedLinkService as BaseHashedLinkService } from "@calcom/features/hashedLink/lib/service/HashedLinkService";

@Injectable()
export class HashedLinkService extends BaseHashedLinkService {
    constructor() {
        super();
    }
}

