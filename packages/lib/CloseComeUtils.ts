import { CalendarEvent } from "@calcom/types/Calendar";

import CloseCom, { CloseComCustomActivityCreate } from "./CloseCom";

export const getCloseComContactIds = async (
  event: CalendarEvent,
  leadFromCalComId: string,
  closeCom: CloseCom
): Promise<string[]> => {
  // Check if attendees exist or to see if any should be created
  const closeComContacts = await closeCom.contact.search({
    emails: event.attendees.map((att) => att.email),
  });
  // NOTE: If contact is duplicated in Close.com we will get more results
  //       messing around with the expected number of contacts retrieved
  if (closeComContacts.data.length < event.attendees.length) {
    // Create missing contacts
    const attendeesEmails = event.attendees.map((att) => att.email);
    // Existing contacts based on attendees emails: contacts may have more
    // than one email, we just need the one used by the event.
    const existingContactsEmails = closeComContacts.data.flatMap((cont) =>
      cont.emails.filter((em) => attendeesEmails.includes(em.email)).map((ems) => ems.email)
    );
    const nonExistingContacts = event.attendees.filter(
      (attendee) => !existingContactsEmails.includes(attendee.email)
    );
    const createdContacts = await Promise.all(
      nonExistingContacts.map(
        async (att) =>
          await closeCom.contact.create({
            person: att,
            leadId: leadFromCalComId,
          })
      )
    );
    if (createdContacts.length === nonExistingContacts.length) {
      // All non existent contacts where created
      return Promise.resolve(
        closeComContacts.data.map((cont) => cont.id).concat(createdContacts.map((cont) => cont.id))
      );
    } else {
      return Promise.reject("Some contacts were not possible to create in Close.com");
    }
  } else {
    return Promise.resolve(closeComContacts.data.map((cont) => cont.id));
  }
};

export const getCustomActivityTypeInstanceData = async (
  event: CalendarEvent,
  calComCustomActivityFields: [string, string, boolean, boolean][],
  closeCom: CloseCom
): Promise<CloseComCustomActivityCreate> => {
  // Get Cal.com generic Lead
  const leadFromCalComId = await getCloseComGenericLeadId(closeCom);
  // Get Contacts ids
  const contactsIds = await getCloseComContactIds(event, leadFromCalComId, closeCom);
  // Get Custom Activity Type id
  const customActivityTypeAndFieldsIds = await getCloseComCustomActivityTypeFieldsIds(
    calComCustomActivityFields,
    closeCom
  );
  // Prepare values for each Custom Activity Fields
  const customActivityFieldsValue = {
    attendee: contactsIds.length > 1 ? contactsIds.slice(1) : null,
    dateTime: event.startTime,
    timezone: event.attendees[0].timeZone,
    organizer: contactsIds[0],
    additionalNotes: event.additionalNotes ?? null,
  };
  // Preparing Custom Activity Instance data for Close.com
  return Object.assign(
    {},
    {
      custom_activity_type_id: customActivityTypeAndFieldsIds.activityType,
      lead_id: leadFromCalComId,
    }, // This is to add each field as "custom.FIELD_ID": "value" in the object
    ...Object.keys(customActivityTypeAndFieldsIds.fields).map((fieldKey: string) => {
      const key = fieldKey as keyof typeof customActivityTypeAndFieldsIds.fields;
      return {
        [`custom.${customActivityTypeAndFieldsIds.fields[key]}`]: customActivityFieldsValue[key],
      };
    })
  );
};

export const getCloseComCustomActivityTypeFieldsIds = async (
  calComCustomActivityFields: [string, string, boolean, boolean][],
  closeCom: CloseCom
) => {
  // Check if Custom Activity Type exists
  const customActivities = await closeCom.customActivity.type.get();
  const calComCustomActivity = customActivities.data.filter((act) => act.name === "Cal.com Activity");
  if (calComCustomActivity.length > 0) {
    // Cal.com Custom Activity type exist
    // Get Custom Activity Fields
    const customActivityAllFields = await closeCom.customField.activity.get({
      query: { _fields: ["name", "custom_activity_type_id", "id"] },
    });
    const customActivityRelevantFields = customActivityAllFields.data.filter(
      (fie) => fie.custom_activity_type_id === calComCustomActivity[0].id
    );
    const customActivityFieldsNames = customActivityRelevantFields.map((fie) => fie.name);
    const customActivityFieldsExist = calComCustomActivityFields.map((cusFie) =>
      customActivityFieldsNames.includes(cusFie[0])
    );
    const [attendee, dateTime, timezone, organizer, additionalNotes] = await Promise.all(
      customActivityFieldsExist.map(async (exist, idx) => {
        if (!exist) {
          const [name, type, required, multiple] = calComCustomActivityFields[idx];
          const created = await closeCom.customField.activity.create({
            custom_activity_type_id: calComCustomActivity[0].id,
            name,
            type,
            required,
            accepts_multiple_values: multiple,
            editable_with_roles: [],
          });
          return created.id;
        } else {
          const index = customActivityFieldsNames.findIndex(
            (val) => val === calComCustomActivityFields[idx][0]
          );
          if (index >= 0) {
            return customActivityRelevantFields[index].id;
          } else {
            throw Error("Couldn't find the field index");
          }
        }
      })
    );
    return {
      activityType: calComCustomActivity[0].id,
      fields: {
        attendee,
        dateTime,
        timezone,
        organizer,
        additionalNotes,
      },
    };
  } else {
    // Cal.com Custom Activity type doesn't exist
    // Create Custom Activity Type
    const { id: activityType } = await closeCom.customActivity.type.create({
      name: "Cal.com Activity",
      description: "Bookings in your Cal.com account",
    });
    // Create Custom Activity Fields
    const [attendee, dateTime, timezone, organizer, additionalNotes] = await Promise.all(
      calComCustomActivityFields.map(async ([name, type, required, multiple]) => {
        const creation = await closeCom.customField.activity.create({
          custom_activity_type_id: activityType,
          name,
          type,
          required,
          accepts_multiple_values: multiple,
          editable_with_roles: [],
        });
        return creation.id;
      })
    );
    return {
      activityType,
      fields: {
        attendee,
        dateTime,
        timezone,
        organizer,
        additionalNotes,
      },
    };
  }
};

/**
 * Check if generic "From Cal.com" Lead exists, create it if not
 */
export const getCloseComGenericLeadId = async (closeCom: CloseCom): Promise<string> => {
  const closeComLeadNames = await closeCom.lead.list({ query: { _fields: ["name", "id"] } });
  const searchLeadFromCalCom = closeComLeadNames.data.filter((lead) => lead.name === "From Cal.com");
  if (searchLeadFromCalCom.length === 0) {
    // No Lead exists, create it
    const createdLeadFromCalCom = await closeCom.lead.create({
      companyName: "From Cal.com",
      description: "Generic Lead for Contacts created by Cal.com",
    });
    return createdLeadFromCalCom.id;
  } else {
    return searchLeadFromCalCom[0].id;
  }
};
