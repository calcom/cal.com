import { AxiomClient, DatasetIngestEvent } from "@axiomhq/axiom-node";
import TransportStream from "winston-transport";

class AxiomTransport extends TransportStream {
  private client: AxiomClient;
  private dataset: string;
  private environment: string;

  constructor(opts: any) {
    super(opts);
    this.client = new AxiomClient({ token: opts.token });
    this.dataset = opts.dataset;
    this.environment = opts.environment || "unknown";
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    const logEvent: DatasetIngestEvent = {
      timestamp: new Date(),
      environment: this.environment,
      ...info,
    };

    this.client.datasets
      .ingest(this.dataset, [logEvent])
      .then(() => callback())
      .catch((err) => {
        console.error("Error sending log to Axiom:", err);
        callback();
      });
  }
}

export { AxiomTransport };
