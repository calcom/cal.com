import type React from "react";

export class AppComponentFactory {
  private static componentCache = new Map<string, React.ComponentType>();
  private static loadingPromises = new Map<string, Promise<React.ComponentType>>();

  static async getComponent(slug: string): Promise<React.ComponentType | null> {
    const cachedComponent = this.componentCache.get(slug);
    if (cachedComponent) {
      return cachedComponent;
    }

    const existingPromise = this.loadingPromises.get(slug);
    if (existingPromise) {
      return existingPromise;
    }

    const newLoadingPromise = this.loadComponent(slug);
    this.loadingPromises.set(slug, newLoadingPromise);

    try {
      const component = await newLoadingPromise;
      this.componentCache.set(slug, component);
      this.loadingPromises.delete(slug);
      return component;
    } catch (error) {
      this.loadingPromises.delete(slug);
      console.warn(`Failed to load component for ${slug}:`, error);
      return null;
    }
  }

  private static async loadComponent(slug: string): Promise<React.ComponentType> {
    const dirName = slug === "stripe" ? "stripepayment" : slug;

    try {
      const componentModule = await import(`../apps/${dirName}/components/EventTypeAppCardInterface`);
      return componentModule.default || componentModule.EventTypeAppCardInterface;
    } catch (error) {
      throw new Error(`Component not found for app: ${slug}`);
    }
  }

  static preloadComponents(slugs: string[]): void {
    slugs.forEach((slug) => {
      this.getComponent(slug).catch((error) => {
        console.debug(`Failed to preload component for ${slug}:`, error);
      });
    });
  }

  static clearCache(): void {
    this.componentCache.clear();
    this.loadingPromises.clear();
  }

  static getCachedComponents(): string[] {
    return Array.from(this.componentCache.keys());
  }
}
