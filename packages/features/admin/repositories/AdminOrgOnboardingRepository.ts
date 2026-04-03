import type { PrismaClient } from "@calcom/prisma";

export interface UpdateOrgOnboardingData {
  name?: string;
  slug?: string;
  orgOwnerEmail?: string;
  billingPeriod?: "MONTHLY" | "ANNUALLY";
  billingMode?: "SEATS" | "ACTIVE_USERS";
  pricePerSeat?: number;
  seats?: number;
  minSeats?: number | null;
  isPlatform?: boolean;
  isComplete?: boolean;
  isDomainConfigured?: boolean;
  logo?: string | null;
  bio?: string | null;
  brandColor?: string | null;
  bannerUrl?: string | null;
  error?: string | null;
}

export class AdminOrgOnboardingRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.organizationOnboarding.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        orgOwnerEmail: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.organizationOnboarding.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        orgOwnerEmail: true,
      },
    });
  }

  async update(id: string, data: UpdateOrgOnboardingData) {
    return this.prisma.organizationOnboarding.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        orgOwnerEmail: true,
        billingPeriod: true,
        billingMode: true,
        pricePerSeat: true,
        seats: true,
        minSeats: true,
        isPlatform: true,
        isComplete: true,
        isDomainConfigured: true,
        logo: true,
        bio: true,
        brandColor: true,
        bannerUrl: true,
        error: true,
      },
    });
  }
}
