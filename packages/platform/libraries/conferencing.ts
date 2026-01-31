export {
  getRecordingsOfCalVideoByRoomName,
  getDownloadLinkOfCalVideoByRecordingId,
  getAllTranscriptsAccessLinkFromRoomName,
  getCalVideoMeetingSessionsByRoomName,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} from "@calcom/features/conferencing/lib/videoClient";

export { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";

export type { CalMeetingParticipant, CalMeetingSession } from "@calcom/app-store/dailyvideo/zod";
