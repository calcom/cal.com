import { cal } from "../index";
import { randomUUID } from "crypto";

describe("Cal.com SDK", () => {
  describe("Users", () => {
    // API Routes
    it(`cal.get('/users') should return a list of users`, async () => {
      await cal.get("/users").then((data: any) => {
        expect(data.users).toBeTruthy();
      });
    });
    it(`cal.get('/users/4') should return a user`, async () => {
      await cal.get("/users/4").then((data: any) => {
        expect(data.user).toBeTruthy();
        expect(data.user.id).toBe(4);
      });
    });
    it(`cal.delete('/users/1') should fail to remove a user that is not owner of apiKey`, async () => {
      await cal.delete("/users/1").catch((error) => {
        expect(error).toBeTruthy();
        expect(error.status).toBe(401);
        expect(error.statusText).toBe("Unauthorized");
      });
    });
    // With Operation IDs
    it("cal.listUsers() returns a list of users", async () => {
      await cal.listUsers().then((users: any) => {
        expect(users).toBeTruthy();
      });
    });
    let user;
    it("cal.getUserById() returns a user", async () => {
      user = await cal
        .getUserById({
          id: 4
        })
        .then((data: any) => {
          expect(data.user).toBeTruthy();
        });
    });
    it("cal.editUserById() edits a user", async () => {
      await cal
        .editUserById(
          {
            timeZone: "Europe/Madrid"
          },
          {
            id: 4
          }
        )
        .then((data: any) => {
          expect(data.user).toBeTruthy();
          expect(data.user.timeZone).toBe("Europe/Madrid");
        });
    });
    it("cal.removeUserById() should remove an user", async () => {
      await cal
        .removeUserById({
          id: 1
        })
        .catch((error) => {
          expect(error).toBeTruthy();
          expect(error.status).toBe(401);
          expect(error.statusText).toBe("Unauthorized");
        });
    });
  });

  // Attendees
  describe("Attendees", () => {
    it("should return a list of attendees", async () => {
      await cal.listAttendees().then((data: any) => {
        expect(data.attendees).toBeTruthy();
      });
    });
    let newAttendee: any;

    it("should create a new attendee", async () => {
      await cal
        .addAttendee({
          bookingId: 1,
          name: "John Doe",
          email: "john@doe.com",
          timeZone: "Europe/Madrid"
        })
        .then((data: any) => {
          newAttendee = data.attendee;
          expect(data.attendee).toBeTruthy();
          expect(data.attendee.timeZone).toBe("Europe/Madrid");
        });
    });
    it("should return an attendee by ID", async () => {
      await cal
        .getAttendeeById({
          id: 1
        })
        .then((data: any) => {
          expect(data.attendee).toBeTruthy();
          expect(data.attendee.timeZone).toBe("Europe/Madrid");
        });
    });
    it("should edit an attendee", async () => {
      await cal
        .editAttendeeById(
          {
            timeZone: "Europe/Madrid"
          },
          {
            id: 1
          }
        )
        .then((data: any) => {
          expect(data.attendee).toBeTruthy();
          expect(data.attendee.timeZone).toBe("Europe/Madrid");
        });
    });
    newAttendee &&
      it("should remove an attendee", async () => {
        await cal
          .removeAttendeeById({
            id: newAttendee.data.id
          })
          .then((data: any) => {
            expect(data.message).toBeTruthy();
          });
      });
  });

  // Availabilities
  describe("Availabilities", () => {
    it("should return a list of availabilities", async () => {
      await cal.listAvailabilities().then((data: any) => {
        expect(data.availabilities).toBeTruthy();
      });
    });
    it("should return an availability by ID", async () => {
      await cal
        .getAvailabilityById({
          id: 14
        })
        .then((data: any) => {
          expect(data.availability).toBeTruthy();
          expect(data.availability.days).toHaveLength(4);
        });
    });
    it("should edit an availability", async () => {
      await cal
        .editAvailabilityById(
          {
            endTime: new Date(),
            days: [1, 2, 3, 4]
          },
          {
            id: 14
          }
        )
        .then((data: any) => {
          expect(data.availability).toBeTruthy();
          expect(data.availability.days).toMatchObject([1, 2, 3, 4]);
        });
    });
    let newAvailability: any;
    it("should create a new availability", async () => {
      await cal
        .addAvailability({
          days: [1, 2, 3, 4, 5],
          startTime: new Date(),
          endTime: new Date()
        })
        .then((data: any) => {
          newAvailability = data.availability;
          expect(data.availability).toBeTruthy();
          expect(data.availability.days).toHaveLength(5);
        });
    });
    newAvailability &&
      it("should remove an availability", async () => {
        await cal
          .removeAvailabilityById({
            id: newAvailability.data.id
          })
          .then((data: any) => {
            expect(data.message).toBeTruthy();
          });
      });
  });

  // BookingReferences
  describe("BookingReferences", () => {
    it("should return a list of booking_references", async () => {
      await cal.listBookingReferences().then((data: any) => {
        expect(data.booking_references).toBeTruthy();
      });
    });
    it("should return an booking_reference by ID", async () => {
      await cal
        .getBookingReferenceById({
          id: 1
        })
        .then((data: any) => {
          expect(data.booking_reference).toBeTruthy();
          expect(data.booking_reference.uid).toBe("12345");
        });
    });
    it("should edit an booking_reference", async () => {
      await cal
        .editBookingReferenceById(
          {
            type: "new-type",
            meetingId: "another-meeting"
          },
          {
            id: 1
          }
        )
        .then((data: any) => {
          expect(data.booking_reference).toBeTruthy();
          expect(data.booking_reference.type).toBe("new-type");
          expect(data.booking_reference.meetingId).toBe("another-meeting");
        });
    });
    let newBookingReference: any;
    it("should create a new booking reference", async () => {
      await cal
        .addBookingReference({
          uid: "12345",
          type: "type",
          meetingId: "ameeting",
          deleted: false,
          bookingId: 1
        })
        .then((data: any) => {
          newBookingReference = data.booking_reference;
          expect(data.booking_reference).toBeTruthy();
          expect(data.booking_reference.uid).toBe("12345");
        });
    });
    newBookingReference &&
      it("should remove an booking reference", async () => {
        await cal
          .removeBookingReferenceById({
            id: newBookingReference.data.id
          })
          .then((data: any) => {
            expect(data.message).toBeTruthy();
          });
      });
  });

  // Bookings
  describe("Bookings", () => {
    it("should return a list of bookings", async () => {
      await cal.listBookings().then((data: any) => {
        expect(data.bookings).toBeTruthy();
      });
    });
    it("should return an booking by ID", async () => {
      await cal
        .getBookingById({
          id: 1
        })
        .then((data: any) => {
          // console.log(data);
          expect(data.booking).toBeTruthy();
          // console.log(data.booking);
          expect(data.booking.uid).toBe("b0100b35-e0d9-415e-95e6-eaa3de41a963");
        });
    });
    it("should edit an booking", async () => {
      await cal
        .editBookingById(
          {
            uid: "b0100b35-e0d9-415e-95e6-eaa3de41a963",
            title: "45min"
            // startTime: new Date("2022-05-05T18:37:29.408Z"),
            // endTime: new Date("2022-05-05T19:07:29.425Z")
          },
          {
            id: 1
          }
        )
        .then((data: any) => {
          console.log(data.booking);
          expect(data.booking).toBeTruthy();
          expect(data.booking.uid).toBe("b0100b35-e0d9-415e-95e6-eaa3de41a963");
          expect(data.booking.title).toBe("45min");
        });
    });
    let newBooking: any;
    const uid = randomUUID();
    it("should create a new booking", async () => {
      await cal
        .addBooking({
          uid,
          title: "45min",
          eventTypeId: 1,
          startTime: new Date("2022-05-05T18:37:29.408Z"),
          endTime: new Date("2022-05-05T19:07:29.425Z")
        })
        .then((data: any) => {
          newBooking = data.booking;
          expect(data.booking).toBeTruthy();
          expect(data.booking.uid).toBe(uid);
          expect(data.booking.title).toBe("45min");
        });
    });
    // it("should remove an booking", async () => {
    //   await cal
    //     .removeBookingById({
    //       id: 1
    //     })
    //     .then((data: any) => {
    //       expect(data.message).toBeTruthy();
    //     });
    // });
  });

  // EventReferences
  describe("EventReferences", () => {
    it("should return a list of bookings", async () => {
      await cal.listEventReferences().then((data: any) => {
        expect(data.bookings).toBeTruthy();
      });
    });
    it("should return an booking by ID", async () => {
      await cal
        .getEventReferenceById({
          id: 1
        })
        .then((data: any) => {
          // console.log(data);
          expect(data.booking).toBeTruthy();
          // console.log(data.booking);
          expect(data.booking.uid).toBe("b0100b35-e0d9-415e-95e6-eaa3de41a963");
        });
    });
    it("should edit an booking", async () => {
      await cal
        .editEventReferenceById(
          {
            // uid: "b0100b35-e0d9-415e-95e6-eaa3de41a963",
            dailyurl: "45min",
            dailytoken: "1" // startTime: new Date("2022-05-05T18:37:29.408Z"),
            // endTime: new Date("2022-05-05T19:07:29.425Z")
          },
          {
            id: 1
          }
        )
        .then((data: any) => {
          console.log(data.booking);
          expect(data.booking).toBeTruthy();
          expect(data.booking.uid).toBe("b0100b35-e0d9-415e-95e6-eaa3de41a963");
          expect(data.booking.title).toBe("45min");
        });
    });
    let newEventReference: any;
    const uid = randomUUID();
    it("should create a new booking", async () => {
      await cal
        .addEventReference({
          // uid,
          dailyurl: "45min",
          dailytoken: "1"
        })
        .then((data: any) => {
          newEventReference = data.booking;
          expect(data.booking).toBeTruthy();
          expect(data.booking.uid).toBe(uid);
          expect(data.booking.title).toBe("45min");
        });
    });
    //   it("should remove an booking", async () => {
    //     await cal
    //       .removeEventReferenceById({
    //         id: 1
    //       })
    //       .then((data: any) => {
    //         expect(data.message).toBeTruthy();
    //       });
    //   });
  });
});
