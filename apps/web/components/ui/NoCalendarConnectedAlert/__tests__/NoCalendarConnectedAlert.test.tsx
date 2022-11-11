import { cleanup, screen, render } from "@testing-library/react";

import { trpc } from "@calcom/trpc/react";

import NoCalendarConnectedAlert from "..";

// TODO: useQuery mock is not working
describe.skip("Testing NoCalendarConnectedAlert", () => {
  describe("Render test", () => {
    it("should render without crashing", () => {
      // Disabled as its asking for full trpc useQuery response
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      jest.spyOn(trpc, "useQuery").mockReturnValue({
        isSuccess: true,
        isFetched: true,
        data: { connectedCalendars: [], destinationCalendar: undefined },
      });
      render(<NoCalendarConnectedAlert />);

      const testProp = screen.getByText("missing_connected_calendar");
      expect(testProp).toBeTruthy();
    });

    it("should not render", () => {
      // Disabled as its asking for full trpc useQuery response
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      jest.spyOn(trpc, "useQuery").mockReturnValue({
        isSuccess: true,
        isFetched: true,
        data: { connectedCalendars: [1, 2], destinationCalendar: { a: "test" } },
      });
      render(<NoCalendarConnectedAlert />);

      expect(screen.queryByText("missing_connected_calendar")).toBeNull();
    });

    afterEach(cleanup);
  });
});
