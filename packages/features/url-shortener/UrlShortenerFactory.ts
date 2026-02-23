import type { IUrlShortenerProvider } from "./IUrlShortenerProvider";
import { DubShortener } from "./providers/DubShortener";
import { NoopShortener } from "./providers/NoopShortener";
import { SinkClient } from "./providers/SinkClient";
import { SinkShortener } from "./providers/SinkShortener";

export class UrlShortenerFactory {
  static create(): IUrlShortenerProvider {
    if (SinkShortener.isConfigured()) {
      return new SinkShortener(new SinkClient());
    }
    if (DubShortener.isConfigured()) {
      return new DubShortener();
    }
    return new NoopShortener();
  }
}
