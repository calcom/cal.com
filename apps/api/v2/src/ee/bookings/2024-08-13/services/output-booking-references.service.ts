import { Injectable } from "@nestjs/common";

interface IBookingReference {
  type: string;
  uid: string;
  id: number;
  externalCalendarId: string | null;
}

@Injectable()
export class OutputBookingReferencesService_2024_08_13 {
  getOutputBookingReferences(bookingReferences: IBookingReference[]) {
    return bookingReferences.map((bookingReference) => ({
      type: bookingReference.type,
      eventUid: bookingReference.uid,
      id: bookingReference.id,
      destinationCalendarId: bookingReference?.externalCalendarId,
    }));
  }
}
