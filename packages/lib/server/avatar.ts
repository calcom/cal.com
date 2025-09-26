import { StorageServiceFactory } from "./storage/StorageServiceFactory";

export const uploadAvatar = async ({ userId, avatar: data }: { userId: number; avatar: string }) => {
  const storageService = StorageServiceFactory.getStorageService();
  return await storageService.uploadAvatar({ userId, data });
};

export const uploadLogo = async ({
  teamId,
  logo: data,
  isBanner = false,
}: {
  teamId: number;
  logo: string;
  isBanner?: boolean;
}): Promise<string> => {
  const storageService = StorageServiceFactory.getStorageService();

  if (isBanner) {
    return await storageService.uploadBanner({ teamId, data });
  } else {
    return await storageService.uploadAvatar({ userId: 0, data });
  }
};
