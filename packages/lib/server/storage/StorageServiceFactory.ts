import { DatabaseStorageService } from "./DatabaseStorageService";
import type { StorageService } from "./StorageService";

export class StorageServiceFactory {
  private static instance: StorageService | null = null;

  static getStorageService(): StorageService {
    if (!this.instance) {
      this.instance = new DatabaseStorageService();
    }
    return this.instance;
  }
}
