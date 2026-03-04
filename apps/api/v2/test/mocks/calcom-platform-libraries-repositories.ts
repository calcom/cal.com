// Mock base classes for @calcom/platform-libraries/repositories
// These are extended by NestJS injectable repositories in apps/api/v2

class BaseRepository {
  protected prismaClient: unknown;
  constructor(prismaClient: unknown) {
    this.prismaClient = prismaClient;
  }
}

export class PrismaBookingRepository extends BaseRepository {}
export class PrismaEventTypeRepository extends BaseRepository {}
export class PrismaScheduleRepository extends BaseRepository {}
export class PrismaSelectedSlotRepository extends BaseRepository {}
export class PrismaTeamRepository extends BaseRepository {}
export class PrismaUserRepository extends BaseRepository {}
export class PrismaFeaturesRepository extends BaseRepository {}
export class PrismaRoutingFormResponseRepository extends BaseRepository {}
export class PrismaOOORepository extends BaseRepository {}
export class PrismaAttributeRepository extends BaseRepository {}
export class PrismaMembershipRepository extends BaseRepository {}
export class PrismaHostRepository extends BaseRepository {}
export class PrismaBookingReferenceRepository extends BaseRepository {}
export class PrismaBookingAttendeeRepository extends BaseRepository {}
export class PrismaProfileRepository extends BaseRepository {}
export class PrismaAccessCodeRepository extends BaseRepository {}
export class PrismaOAuthClientRepository extends BaseRepository {}
export class PrismaOAuthRefreshTokenRepository extends BaseRepository {}
export class PrismaHolidayRepository extends BaseRepository {}
