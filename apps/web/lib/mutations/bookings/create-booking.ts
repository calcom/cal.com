import type { BookingCreateBody } from "@calcom/prisma/zod-utils";



import * as fetch from "@lib/core/http/fetch-wrapper";
import type { BookingResponse } from "@lib/types/booking";


type BookingCreateBodyForMutation = Omit<BookingCreateBody, "location">;
const createBooking = async (data: BookingCreateBodyForMutation) => {


  console.log("HELLO: ", data);
  const response = await fetch.post<BookingCreateBodyForMutation, BookingResponse>("/api/book/event", data);

  console.log("HELLO: ", response)

  return response;
};

export default createBooking;