import type { CredentialPayload } from "@calcom/types/Credential";
import type { VideoApiAdapter } from "@calcom/types/VideoApiAdapter";
/** @link https://docs.microsoft.com/en-us/graph/api/application-post-onlinemeetings?view=graph-rest-1.0&tabs=http#response */
export interface TeamsEventResult {
    creationDateTime: string;
    startDateTime: string;
    endDateTime: string;
    id: string;
    joinWebUrl: string;
    subject: string;
}
declare const TeamsVideoApiAdapter: (credential: CredentialPayload) => VideoApiAdapter;
export default TeamsVideoApiAdapter;
//# sourceMappingURL=VideoApiAdapter.d.ts.map