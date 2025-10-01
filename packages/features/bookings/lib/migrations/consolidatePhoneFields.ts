import { prisma } from "@calcom/prisma";
import { SMS_REMINDER_NUMBER_FIELD, CAL_AI_AGENT_PHONE_NUMBER_FIELD } from "@calcom/features/bookings/lib/SystemField";
import type { Fields } from "@calcom/features/bookings/lib/getBookingFields";

/**
 * Migration script to consolidate phone fields in existing event types
 * This can be run manually or as part of a database migration
 */
export async function consolidatePhoneFieldsInEventTypes() {
  console.log("Starting phone field consolidation migration...");
  
  // Get all event types with booking fields
  const eventTypes = await prisma.eventType.findMany({
    where: {
      bookingFields: {
        not: null
      }
    },
    select: {
      id: true,
      bookingFields: true,
    }
  });

  let updatedCount = 0;

  for (const eventType of eventTypes) {
    if (!eventType.bookingFields || typeof eventType.bookingFields !== 'object') {
      continue;
    }

    const bookingFields = eventType.bookingFields as Fields;
    
    // Check if this event type has any of the old phone fields
    const hasOldPhoneFields = bookingFields.some(
      field => field.name === SMS_REMINDER_NUMBER_FIELD || 
               field.name === CAL_AI_AGENT_PHONE_NUMBER_FIELD
    );

    if (hasOldPhoneFields) {
      // Remove old phone fields
      const updatedFields = bookingFields.filter(
        field => field.name !== SMS_REMINDER_NUMBER_FIELD && 
                 field.name !== CAL_AI_AGENT_PHONE_NUMBER_FIELD
      );

      // Update the event type
      await prisma.eventType.update({
        where: { id: eventType.id },
        data: { 
          bookingFields: updatedFields as Fields
        }
      });

      updatedCount++;
      console.log(`Updated event type ${eventType.id} - removed old phone fields`);
    }
  }

  console.log(`Migration completed. Updated ${updatedCount} event types.`);
}

// Utility function to run this migration
export async function runPhoneFieldConsolidation() {
  try {
    await consolidatePhoneFieldsInEventTypes();
  } catch (error) {
    console.error("Error during phone field consolidation:", error);
    throw error;
  }
}