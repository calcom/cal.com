export interface StorageService {
  uploadBanner(params: { teamId: number; data: string }): Promise<string>;

  uploadAvatar(params: { userId: number; data: string }): Promise<string>;

  retrieveImage(objectKey: string): Promise<{
    data: string;
    contentType: string;
  }>;

  deleteImage(objectKey: string): Promise<void>;
}
