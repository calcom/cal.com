export interface AuditLogsManager {
  report(event: AuditLogEvent): void;
}

export type AuditLogEvent = {
  action: string;
  group?: {
    id: string;
    name?: string;
  };
  crud?: string;
  created?: Date;
  actor?: {
    id: string;
    name?: string;
    href?: string;
    fields?: {
      [key: string]: string;
    };
  };
  target?: {
    id: string;
    name?: string;
    href?: string;
    type?: string;
    fields?: {
      [key: string]: string;
    };
  };
  source_ip?: string;
  description?: string;
  is_failure?: boolean;
  is_anonymous?: boolean;
  fields?: {
    [key: string]: string;
  };
};
