import { expect, it } from "@jest/globals";
import { whereAndSelect } from "@lib/prisma";

it("can decorate using whereAndSelect", async () => {
  whereAndSelect(
    (queryObj) => {
      expect(queryObj).toStrictEqual({ where: { id: 1 }, select: { example: true } });
    },
    { id: 1 },
    ["example"]
  );
});

it("can do nested selects using . seperator", async () => {
  whereAndSelect(
    (queryObj) => {
      expect(queryObj).toStrictEqual({
        where: {
          uid: 1,
        },
        select: {
          description: true,
          attendees: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });
    },
    { uid: 1 },
    ["description", "attendees.email", "attendees.name"]
  );
});

it("can handle nesting deeply", async () => {
  whereAndSelect(
    (queryObj) => {
      expect(queryObj).toStrictEqual({
        where: {
          uid: 1,
        },
        select: {
          description: true,
          attendees: {
            select: {
              email: {
                select: {
                  nested: true,
                },
              },
              name: true,
            },
          },
        },
      });
    },
    { uid: 1 },
    ["description", "attendees.email.nested", "attendees.name"]
  );
});

it("can handle nesting multiple", async () => {
  whereAndSelect(
    (queryObj) => {
      expect(queryObj).toStrictEqual({
        where: {
          uid: 1,
        },
        select: {
          description: true,
          attendees: {
            select: {
              email: true,
              name: true,
            },
          },
          bookings: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    },
    { uid: 1 },
    ["description", "attendees.email", "attendees.name", "bookings.id", "bookings.name"]
  );
});
