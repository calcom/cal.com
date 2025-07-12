/**
 * Performance Monitor for Cal.com
 * Tracks bundle size, load times, and Core Web Vitals
 */
import { onCLS, onFCP, onFID, onLCP, onTTFB } from "web-vitals";

export interface PerformanceMetric {
  name: string;
  value: number;
  id: string;
  label: string;
  startTime?: number;
  duration?: number;
}

export interface BundleAnalytics {
  totalSize: number;
  chunkCount: number;
  largestChunks: string[];
  compressionRatio: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private bundleAnalytics: BundleAnalytics | null = null;

  constructor() {
    this.initializeWebVitals();
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals() {
    // Only run in browser environment
    if (typeof window === "undefined") return;

    // Track all Core Web Vitals
    onCLS((metric: any) => this.recordMetric(metric));
    onFCP((metric: any) => this.recordMetric(metric));
    onFID((metric: any) => this.recordMetric(metric));
    onLCP((metric: any) => this.recordMetric(metric));
    onTTFB((metric: any) => this.recordMetric(metric));
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[Performance] ${metric.name}: ${metric.value}ms`);
    }

    // Send to analytics service
    this.sendToAnalytics(metric);
  }

  /**
   * Send metrics to analytics service
   */
  private sendToAnalytics(metric: PerformanceMetric) {
    // If PostHog is available, send the metric
    if (typeof window !== "undefined" && (window as any).posthog) {
      (window as any).posthog.capture("performance_metric", {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_id: metric.id,
        metric_label: metric.label,
        url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Measure bundle size and performance
   */
  public measureBundleSize(): Promise<BundleAnalytics> {
    return new Promise((resolve) => {
      // Only available in browser
      if (typeof window === "undefined") {
        resolve({
          totalSize: 0,
          chunkCount: 0,
          largestChunks: [],
          compressionRatio: 0,
        });
        return;
      }

      // Use Performance API to get resource information
      const resources = performance.getEntriesByType("resource");
      const jsResources = resources.filter(
        (resource) => resource.name.includes(".js") && resource.name.includes("/_next/static/")
      );

      const totalSize = jsResources.reduce((sum, resource) => {
        const size = (resource as any).transferSize || (resource as any).encodedBodySize || 0;
        return sum + size;
      }, 0);

      const chunkCount = jsResources.length;
      const largestChunks = jsResources
        .map((resource) => ({
          name: resource.name.split("/").pop() || "unknown",
          size: (resource as any).transferSize || (resource as any).encodedBodySize || 0,
        }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 10)
        .map((chunk) => chunk.name);

      const uncompressedSize = jsResources.reduce((sum, resource) => {
        const size = (resource as any).decodedBodySize || (resource as any).transferSize || 0;
        return sum + size;
      }, 0);

      const compressionRatio = uncompressedSize > 0 ? totalSize / uncompressedSize : 0;

      this.bundleAnalytics = {
        totalSize,
        chunkCount,
        largestChunks,
        compressionRatio,
      };

      resolve(this.bundleAnalytics);
    });
  }

  /**
   * Get all recorded metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  /**
   * Get bundle analytics
   */
  public getBundleAnalytics(): BundleAnalytics | null {
    return this.bundleAnalytics;
  }

  /**
   * Generate performance report
   */
  public generateReport(): string {
    const metrics = this.getMetrics();
    const bundle = this.getBundleAnalytics();

    let report = "📊 Performance Report\n";
    report += "===================\n\n";

    // Core Web Vitals
    report += "🎯 Core Web Vitals:\n";
    const lcp = metrics.find((m) => m.name === "LCP");
    const fid = metrics.find((m) => m.name === "FID");
    const cls = metrics.find((m) => m.name === "CLS");
    const fcp = metrics.find((m) => m.name === "FCP");
    const ttfb = metrics.find((m) => m.name === "TTFB");

    if (lcp) report += `  • LCP: ${lcp.value.toFixed(2)}ms ${lcp.value < 2500 ? "✅" : "❌"}\n`;
    if (fid) report += `  • FID: ${fid.value.toFixed(2)}ms ${fid.value < 100 ? "✅" : "❌"}\n`;
    if (cls) report += `  • CLS: ${cls.value.toFixed(3)} ${cls.value < 0.1 ? "✅" : "❌"}\n`;
    if (fcp) report += `  • FCP: ${fcp.value.toFixed(2)}ms ${fcp.value < 1800 ? "✅" : "❌"}\n`;
    if (ttfb) report += `  • TTFB: ${ttfb.value.toFixed(2)}ms ${ttfb.value < 600 ? "✅" : "❌"}\n`;

    // Bundle Information
    if (bundle) {
      report += "\n📦 Bundle Information:\n";
      report += `  • Total Size: ${(bundle.totalSize / 1024 / 1024).toFixed(2)}MB\n`;
      report += `  • Chunk Count: ${bundle.chunkCount}\n`;
      report += `  • Compression Ratio: ${(bundle.compressionRatio * 100).toFixed(1)}%\n`;
      report += `  • Largest Chunks: ${bundle.largestChunks.slice(0, 5).join(", ")}\n`;
    }

    return report;
  }

  /**
   * Start monitoring session
   */
  public startMonitoring() {
    console.log("🔍 Performance monitoring started");

    // Measure bundle size after page load
    if (typeof window !== "undefined") {
      window.addEventListener("load", () => {
        setTimeout(() => {
          this.measureBundleSize().then(() => {
            console.log("📊 Bundle analysis complete");
            if (process.env.NODE_ENV === "development") {
              console.log(this.generateReport());
            }
          });
        }, 1000);
      });
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export for use in _app.tsx
export function reportWebVitals(metric: PerformanceMetric) {
  performanceMonitor["recordMetric"](metric);
}

// Export utility functions
export const trackPerformance = {
  measureBundleSize: () => performanceMonitor.measureBundleSize(),
  getMetrics: () => performanceMonitor.getMetrics(),
  generateReport: () => performanceMonitor.generateReport(),
  startMonitoring: () => performanceMonitor.startMonitoring(),
};
