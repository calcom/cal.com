import type { ServiceAccount } from "firebase-admin";
import admin from "firebase-admin";

import { FIREBASE_SERVICE_ACCOUNT } from "@calcom/lib/constants";

class FirebaseService {
  private static instance: FirebaseService;

  private constructor() {
    if (!admin.apps.length) {
      if (!FIREBASE_SERVICE_ACCOUNT) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT is not defined");
      }
      let serviceAccount: ServiceAccount;
      try {
        serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
        serviceAccount.privateKey = serviceAccount.privateKey?.replace(/\\n/g, "\n");
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } catch (error) {
        throw new Error(
          error instanceof SyntaxError
            ? "Invalid FIREBASE_SERVICE_ACCOUNT JSON format"
          : "Invalid FIREBASE_SERVICE_ACCOUNT"
        );
      }
    }
  }

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  getAdmin(): typeof admin {
    return admin;
  }

  async sendNotification(
    topic: string,
    payload: { title: string; body: string },
    metadata = {}
  ): Promise<string> {
    try {
      const formattedMetadata = Object.fromEntries(
        Object.entries(metadata).map(([key, value]) => [key, String(value)])
      );
      const message = {
        notification: payload,
        data: {
          ...formattedMetadata,
        },
        topic,
        //Android config
        android: {
          priority: "high" as "high" | "normal",
          notification: {
            channel_id: "high_importance_channel",
            sound: "default",
          },
        },
        //Apple Push Notification config (APN)
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
          headers: {
            "apns-push-type": "alert",
            "apns-priority": "10", // Must be `5` when `contentAvailable` is set to true.
            "apns-topic": "id.cal.ios", // bundle identifier
          },
        },
      };

      const response = await admin.messaging().send(message);
      return response;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }
}

export default FirebaseService.getInstance();
