import { Injectable } from "@nestjs/common";

interface IBookingReference {
  type: string;
  uid: string;
  id: number;
}

@Injectable()
export class OutputBookingReferencesService_2024_08_13 {
  getOutputBookingReferences(bookingReferences: IBookingReference[]) {
    return bookingReferences.map((bookingReference) => ({
      type: bookingReference.type,
      externalUid: bookingReference.uid,
      id: bookingReference.id,
    }));
  }
}
