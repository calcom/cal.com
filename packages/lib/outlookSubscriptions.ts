import { prisma } from "@calcom/prisma";
import { CredentialPayload } from "@calcom/types/Credential";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import { cacheSubscription, getCachedSubscription, deleteCachedSubscription } from "./calendarCache";
import { getOffice365CalendarCredentials } from "./office365calendar/getCredentials";
import { refreshOAuth2Token } from "./refreshOAuth2Token";

// Maximum subscription lifetime in minutes (3 days)
const MAX_SUBSCRIPTION_LIFETIME_MINUTES = 4230;

// Create a subscription for a user's calendar
export const createOutlookSubscription = async (
  userId: number,
  credentialId: number,
  calendarId: string
) => {
  try {
    // Get the credential
    const credential = await prisma.credential.findFirst({
      where: {
        id: credentialId,
        userId,
      },
      select: {
        id: true,
        key: true,
        appId: true,
      },
    });

    if (!credential) {
      throw new HttpError({ statusCode: 404, message: "Credential not found" });
    }

    // Get the OAuth token
    const { token, expiry_date } = getOffice365CalendarCredentials(credential.key);
    // Refresh token if needed
    const isExpired = expiry_date < Date.now();
    let accessToken = token.access_token;
    if (isExpired) {
      const refreshedCredential = await refreshOAuth2Token(credential);
      const refreshedKey = JSON.parse(refreshedCredential.key as string);
      accessToken = refreshedKey.token.access_token;
    }

    // Create the subscription
    const expirationDateTime = new Date();
    expirationDateTime.setMinutes(expirationDateTime.getMinutes() + MAX_SUBSCRIPTION_LIFETIME_MINUTES);
    const notificationUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/integrations/office365calendar/webhook`;
    const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        changeType: "created,updated,deleted",
        notificationUrl,
        resource: calendarId ? `users/me/calendars/${calendarId}/events` : "users/me/events",
        expirationDateTime: expirationDateTime.toISOString(),
        clientState: `userId_${userId}_credentialId_${credentialId}`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create subscription: ${JSON.stringify(errorData)}`);
    }

    const subscriptionData = await response.json();
    // Store the subscription in cache
    await cacheSubscription(
      userId,
      credentialId,
      calendarId,
      subscriptionData.id,
      subscriptionData.expirationDateTime
    );
    return subscriptionData;
  } catch (error) {
    console.error("Error creating Outlook subscription:", error);
    throw getErrorFromUnknown(error);
  }
};

// Renew a subscription before it expires
export const renewOutlookSubscription = async (
  userId: number,
  credentialId: number,
  calendarId: string
) => {
  try {
    // Get the cached subscription
    const subscription = await getCachedSubscription(userId, credentialId, calendarId);
    if (!subscription) {
      // Create a new subscription if none exists
      return await createOutlookSubscription(userId, credentialId, calendarId);
    }
    // Check if the subscription is about to expire (within 12 hours)
    const expirationDate = new Date(subscription.expirationDateTime);
    const now = new Date();
    const hoursUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilExpiration < 12) {
      // Get the credential
      const credential = await prisma.credential.findFirst({
        where: {
          id: credentialId,
          userId,
        },
        select: {
          id: true,
          key: true,
          appId: true,
        },
      });
      if (!credential) {
        throw new HttpError({ statusCode: 404, message: "Credential not found" });
      }
      // Get the OAuth token
      const { token, expiry_date } = getOffice365CalendarCredentials(credential.key);
      // Refresh token if needed
      const isExpired = expiry_date < Date.now();
      let accessToken = token.access_token;
      if (isExpired) {
        const refreshedCredential = await refreshOAuth2Token(credential);
        const refreshedKey = JSON.parse(refreshedCredential.key as string);
        accessToken = refreshedKey.token.access_token;
      }
      // Renew the subscription
      const newExpirationDateTime = new Date();
      newExpirationDateTime.setMinutes(newExpirationDateTime.getMinutes() + MAX_SUBSCRIPTION_LIFETIME_MINUTES);
      const response = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscription.subscriptionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          expirationDateTime: newExpirationDateTime.toISOString(),
        }),
      });
      if (!response.ok) {
        // If renewal fails, create a new subscription
        await deleteCachedSubscription(userId, credentialId, calendarId);
        return await createOutlookSubscription(userId, credentialId, calendarId);
      }
      const renewedSubscription = await response.json();
      // Update the subscription in cache
      await cacheSubscription(
        userId,
        credentialId,
        calendarId,
        renewedSubscription.id,
        renewedSubscription.expirationDateTime
      );
      return renewedSubscription;
    }
    return subscription;
  } catch (error) {
    console.error("Error renewing Outlook subscription:", error);
    throw getErrorFromUnknown(error);
  }
};

// Delete a subscription
export const deleteOutlookSubscription = async (
  userId: number,
  credentialId: number,
  calendarId: string
) => {
  try {
    // Get the cached subscription
    const subscription = await getCachedSubscription(userId, credentialId, calendarId);
    if (!subscription) return true;
    // Get the credential
    const credential = await prisma.credential.findFirst({
      where: {
        id: credentialId,
        userId,
      },
      select: {
        id: true,
        key: true,
        appId: true,
      },
    });
    if (!credential) {
      throw new HttpError({ statusCode: 404, message: "Credential not found" });
    }
    // Get the OAuth token
    const { token, expiry_date } = getOffice365CalendarCredentials(credential.key);
    // Refresh token if needed
    const isExpired = expiry_date < Date.now();
    let accessToken = token.access_token;
    if (isExpired) {
      const refreshedCredential = await refreshOAuth2Token(credential);
      const refreshedKey = JSON.parse(refreshedCredential.key as string);
      accessToken = refreshedKey.token.access_token;
    }
    // Delete the subscription from Microsoft Graph
    await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscription.subscriptionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    // Delete from cache
    await deleteCachedSubscription(userId, credentialId, calendarId);
    return true;
  } catch (error) {
    console.error("Error deleting Outlook subscription:", error);
    return false;
  }
};
