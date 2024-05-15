export interface AuditLogsManager {
  report(message: string): void;
}

// export class AuditLogManagerDummy implements AuditLogsManager {
//   constructor(appKeys: { apiKey: string; projectId: string }) {
//     console.log("Audit Log Manager Initiated");
//   }
//
//   report(message: string) {
//     console.log(message);
//   }
// }
