import type { IAppStore } from "./IAppStore";
import { ProductionAppStore } from "./ProductionAppStore";
import { TestAppStore } from "./TestAppStore";
import type { TestCalendarConfig, TestCrmConfig, TestVideoConfig } from "./TestAppStore";

export class AppStoreFactory {
  private static instance: IAppStore | null = null;

  static setTestAppStore(
    config: {
      calendar?: TestCalendarConfig;
      crm?: TestCrmConfig;
      video?: TestVideoConfig;
    } = {}
  ): void {
    this.instance = new TestAppStore(config);
  }

  static setProductionAppStore(): void {
    this.instance = new ProductionAppStore();
  }

  static getAppStore(): IAppStore {
    if (!this.instance) {
      this.instance = new ProductionAppStore();
    }
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}
