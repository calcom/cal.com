import { Booking } from "@prisma/client";
import { trpc } from "@calcom/trpc/react";

const schedule = require('node-schedule');

export function scheduleTriggerJob(booking: Booking, subscriberUrl: string) {
  const job = schedule.scheduleJob(booking.endTime, async function(){
    const body= JSON.stringify(booking);
    await fetch(subscriberUrl, {
      method: "POST",
      body,
    });
  });

  const udpateScheduledJob = trpc.useMutation("viewer.bookings.udpateScheduledJob");

  udpateScheduledJob.mutate({ bookingId: booking.id, scheduledJob: job.name });

  //save job name to bookings
}

export function cancelScheduledTriggerJob(booking: Booking) {
  const key = booking.scheduledJob;
  if(key) {
    schedule.scheduledJobs[key].cancel();
    //still needs to be removed from DB
  }
}

export function getScheduledJobs(){
  console.log("test")
  console.log(schedule.scheduledJobs)
}
