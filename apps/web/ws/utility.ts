const startTime = data.slotUtcStartDate;
const eventTypeId = data.eventTypeId;
const bookingUid = data.bookingUid;

const checknumSlots = async (bookingUid) => {
  const bookingWithAttendees = await prisma.booking.findFirst({
    where: { uid: bookingUid },
    select: { attendees: true },
  });
  const bookingAttendeesLength = bookingWithAttendees?.attendees?.length;
  const seatsLeft = eventType.seatsPerTimeSlot - bookingAttendeesLength;

  if (seatsLeft === 0) {
    return "No slots available";
  } else if (seatsLeft === 1) {
    return "1 slot available";
  } else {
    return `${data.numSlots} slots available`;
  }
  wss.clients.forEach((client) => {
    client.send(JSON.stringify(data));
  }, 1000);
};
