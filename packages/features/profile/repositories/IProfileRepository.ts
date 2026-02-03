export interface OrganizationProfile {
  id: number;
  uid: string;
  userId: number;
  organizationId: number;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProfileRepository {
  findFirstByUserId({ userId }: { userId: number }): Promise<OrganizationProfile | null>;
}
