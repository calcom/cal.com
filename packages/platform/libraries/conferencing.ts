export { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
export type { CalMeetingParticipant, CalMeetingSession } from "@calcom/app-store/dailyvideo/zod";
export {
  createMeeting,
  deleteMeeting,
  getAllTranscriptsAccessLinkFromRoomName,
  getCalVideoMeetingSessionsByRoomName,
  getDownloadLinkOfCalVideoByRecordingId,
  getRecordingsOfCalVideoByRoomName,
  updateMeeting,
} from "@calcom/features/conferencing/lib/videoClient";
