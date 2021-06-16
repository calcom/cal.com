import {VideoCallData} from "../videoClient";

export function getIntegrationName(videoCallData: VideoCallData): string {
  //TODO: When there are more complex integration type strings, we should consider using an extra field in the DB for that.
  const nameProto = videoCallData.type.split("_")[0];
  return nameProto.charAt(0).toUpperCase() + nameProto.slice(1);
}

export function getFormattedMeetingId(videoCallData: VideoCallData): string {
  switch(videoCallData.type) {
    case 'zoom_video':
      const strId = videoCallData.id.toString();
      const part1 = strId.slice(0, 3);
      const part2 = strId.slice(3, 7);
      const part3 = strId.slice(7, 11);
      return part1 + " " + part2 + " " + part3;
    default:
      return videoCallData.id.toString();
  }
}