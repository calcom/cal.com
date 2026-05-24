import { symmetricDecrypt } from "@calcom/lib/crypto";
import { buildUrl } from "@calcom/lib/url/buildUrl";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { metadata } from "../_metadata";
import { bbbCredentialKeySchema } from "../zod";
import { callBbb, generateMeetingPassword } from "./bbbClient";

/**
 * 从加密存储的 credential key 中解密并验证 BBB 凭证
 * 使用 CALENDSO_ENCRYPTION_KEY 环境变量进行解密
 */
async function decryptCredentialKey(credentialKey: unknown) {
  const encryptionKey = process.env.CALENDSO_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("CALENDSO_ENCRYPTION_KEY environment variable is not set.");
  }

  if (typeof credentialKey !== "string") {
    throw new Error("Invalid credential key format.");
  }

  const decrypted = symmetricDecrypt(credentialKey, encryptionKey);
  const parsed = JSON.parse(decrypted);
  return bbbCredentialKeySchema.parse(parsed);
}

/** 计算两个日期之间的分钟差（向上取整） */
function minutesBetween(start: string, end: string): number {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
}

/**
 * BigBlueButton VideoApiAdapter
 * 实现 VideoApiAdapter 接口，通过 BBB API 管理会议生命周期
 */
const BigBlueButtonVideoApiAdapter = (credential: {
  id: number;
  appId: string | null;
  key: unknown;
  teamId: number | null;
  userId: number | null;
}): VideoApiAdapter => {
  return {
    getAvailability: () => Promise.resolve([]),

    /**
     * 创建 BBB 会议
     * 通过 BBB create API 创建会议，返回包含加入链接的会议数据
     */
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> => {
      const bbbCredential = await decryptCredentialKey(credential.key);
      const moderatorPW = generateMeetingPassword();
      const attendeePW = generateMeetingPassword();
      const meetingId = `${metadata.slug}-${event.uid}`;

      const duration = minutesBetween(event.startTime, event.endTime);
      // 不需要检查，每次都创建新会议；如有同名会议则通过 end 接口清理后再创建（幂等处理交给 bbbClient 的 attemptCreate 逻辑）
      const params = new URLSearchParams({
        meetingID: meetingId,
        name: event.title,
        attendeePW,
        moderatorPW,
        welcome: "",
        duration: String(duration),
        record: "false",
        autoStartRecording: "false",
        allowStartStopRecording: "true",
        webcamsOnlyForModerator: "false",
        logo: "",
        // copyright 和 bannerColor 使用空值，不做展示层配置
        logoutURL: "",
        "meta_bn-recording-ready-url": "",
      });

      await callBbb(
        bbbCredential.serverUrl,
        "create",
        params.toString(),
        bbbCredential.sharedSecret
      );

      // 构建参会者加入链接：attendeePW 直接嵌入 URL
      const joinUrl = buildUrl({
        baseUrl: bbbCredential.serverUrl,
        path: `/api/join`,
        queryParams: {
          meetingID: meetingId,
          password: attendeePW,
          fullName: "Guest",
        },
      });

      return {
        type: metadata.type,
        id: meetingId,
        password: moderatorPW,
        url: joinUrl,
      };
    },

    /**
     * 删除 BBB 会议
     * 调用 BBB end API 终止会议
     */
    deleteMeeting: async (uid: string): Promise<void> => {
      const bbbCredential = await decryptCredentialKey(credential.key);
      const meetingId = `${metadata.slug}-${uid}`;
      const params = new URLSearchParams({ meetingID: meetingId, password: "" });
      await callBbb(
        bbbCredential.serverUrl,
        "end",
        params.toString(),
        bbbCredential.sharedSecret
      );
    },

    /**
     * 更新已存在的 BBB 会议
     * 重用已有的 meetingId 和 moderatorPW
     */
    updateMeeting: async (
      bookingRef: PartialReference,
      event: CalendarEvent
    ): Promise<VideoCallData> => {
      const bbbCredential = await decryptCredentialKey(credential.key);
      const meetingId = bookingRef.meetingId as string;
      const moderatorPW = bookingRef.meetingPassword as string;
      const attendeePW = generateMeetingPassword();

      const params = new URLSearchParams({
        meetingID: meetingId,
        name: event.title,
        attendeePW,
        moderatorPW,
        // 更新不传 duration 等字段，避免覆盖初始设定
      });

      await callBbb(
        bbbCredential.serverUrl,
        "create",
        params.toString(),
        bbbCredential.sharedSecret
      );

      const joinUrl = buildUrl({
        baseUrl: bbbCredential.serverUrl,
        path: `/api/join`,
        queryParams: {
          meetingID: meetingId,
          password: attendeePW,
          fullName: "Guest",
        },
      });

      return {
        type: metadata.type,
        id: meetingId,
        password: moderatorPW,
        url: joinUrl,
      };
    },

    /**
     * 获取 BBB 服务器的录像列表
     */
    getRecordings: async (roomName: string) => {
      const bbbCredential = await decryptCredentialKey(credential.key);
      const params = new URLSearchParams({ meetingID: roomName });
      const response = await callBbb(
        bbbCredential.serverUrl,
        "getRecordings",
        params.toString(),
        bbbCredential.sharedSecret
      );

      const recordings = response.recordings as
        | { recording: Array<Record<string, unknown>> }
        | undefined;
      if (!recordings?.recording) {
        return { recordings: [] };
      }

      const recordingArray = Array.isArray(recordings.recording)
        ? recordings.recording
        : [recordings.recording];

      return {
        recordings: recordingArray.map((rec: Record<string, unknown>) => ({
          id: String(rec.recordID || ""),
          startTime: String(rec.startTime || ""),
          endTime: String(rec.endTime || ""),
          // BBB getRecordings 返回的 recording 不包含 downloadToken；需要在 getRecordingDownloadLink 中查询
          downloadLink: "",
          accessLink: "",
        })),
      };
    },

    /**
     * 获取单个录像的下载链接
     */
    getRecordingDownloadLink: async (recordingId: string) => {
      const bbbCredential = await decryptCredentialKey(credential.key);
      const params = new URLSearchParams({ recordID: recordingId });
      const response = await callBbb(
        bbbCredential.serverUrl,
        "getRecordings",
        params.toString(),
        bbbCredential.sharedSecret
      );

      const recordings = response.recordings as
        | { recording: Array<Record<string, unknown>> }
        | undefined;

      if (!recordings?.recording) {
        return { download_link: "" };
      }

      const recordingArray = Array.isArray(recordings.recording)
        ? recordings.recording
        : [recordings.recording];

      const recording = recordingArray[0] as
        | { playback?: { format?: Array<{ type: string; url: string }> } }
        | undefined;

      const formats = recording?.playback?.format || [];
      const presentationFormat = Array.isArray(formats)
        ? formats.find((f) => f.type === "presentation")
        : null;

      return {
        download_link: presentationFormat?.url || "",
      };
    },
  };
};

export default BigBlueButtonVideoApiAdapter;