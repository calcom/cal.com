import { VideoCallData } from "../videoClient";

export function getIntegrationName(videoCallData: VideoCallData): string {
  //TODO: When there are more complex integration type strings, we should consider using an extra field in the DB for that.
  const nameProto = videoCallData.type.split("_")[0];
  return nameProto.charAt(0).toUpperCase() + nameProto.slice(1);
}

function extractZoom(videoCallData: VideoCallData): string {
  const strId = videoCallData.id.toString();
  const part1 = strId.slice(0, 3);
  const part2 = strId.slice(3, 7);
  const part3 = strId.slice(7, 11);

  return part1 + " " + part2 + " " + part3;
}

export function getFormattedMeetingId(videoCallData: VideoCallData): string {
  switch (videoCallData.type) {
    case "zoom_video":
      return extractZoom(videoCallData);
    default:
      return videoCallData.id.toString();
  }
}

export function stripHtml(html: string): string {
  const aMailToRegExp = /<a[\s\w="_:#;]*href="mailto:([^<>"]*)"[\s\w="_:#;]*>([^<>]*)<\/a>/g;
  const aLinkRegExp = /<a[\s\w="_:#;]*href="([^<>"]*)"[\s\w="_:#;]*>([^<>]*)<\/a>/g;
  return html
    .replace(/<br\s?\/>/g, "\n")
    .replace(aMailToRegExp, "$1")
    .replace(aLinkRegExp, "$2: $1")
    .replace(/<[^>]+>/g, "");
}
