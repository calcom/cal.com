/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { CreateBtnProps } from "./CreateButton";
import { CreateButtonWithTeamsList } from "./CreateButtonWithTeamsList";

const mockRouter = {
  push: vi.fn((path: string) => {
    return;
  }),
};

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useRouter: vi.fn(() => mockRouter),
  };
});

const runtimeMock = async (data: Array<any>) => {
  const updatedTrpc = {
    viewer: {
      loggedInViewerRouter: {
        teamsAndUserProfilesQuery: {
          useQuery() {
            return {
              data: data,
            };
          },
        },
      },
    },
  };
  const mockedLib = (await import("@calcom/trpc/react")) as any;
  mockedLib.trpc = updatedTrpc;
};
const renderCreateButton = (
  props: Omit<CreateBtnProps, "options"> & { onlyShowWithTeams?: boolean; onlyShowWithNoTeams?: boolean }
) => {
  return render(<CreateButtonWithTeamsList {...props} />);
};

describe("Create Button Tests", () => {
  describe("Create Button Tests With Valid Team", () => {
    beforeAll(async () => {
      // INFO: This needs to be here before the other calls to runtimeMock. For some reason,
      // when we moved this file from @calcom/ui, the imports started breaking, resulting in
      // errors of "Cannot set property 'trpc' of [object Module] which has only a getter"
      // TODO: Update this pattern to be more consistent. Using this direct mocking in the
      // functions below breaks some tests.
      vi.mock("@calcom/trpc/react", () => ({
        trpc: {
          viewer: {
            loggedInViewerRouter: {
              teamsAndUserProfilesQuery: {
                useQuery() {
                  return {
                    data: [
                      {
                        teamId: 1,
                        name: "test",
                        slug: "create-button-test",
                        image: "image",
                      },
                    ],
                  };
                },
              },
            },
          },
        },
      }));
    });
    test("Should render the create-button-dropdown button", () => {
      const createFunction = vi.fn();
      renderCreateButton({ createFunction });

      const createButton = screen.getByTestId("create-button-dropdown");
      expect(createButton).toBeInTheDocument();
    });
  });

  describe("Create Button Tests With One Null Team", () => {
    beforeAll(async () => {
      await runtimeMock([
        {
          teamId: null,
          name: "test",
          slug: "create-button-test",
          image: "image",
          readOnly: false,
        },
      ]);
    });

    test("Should render only the create-button button", () => {
      const createFunction = vi.fn();
      renderCreateButton({ createFunction });

      const createButton = screen.getByTestId("create-button");
      expect(screen.queryByTestId("create-button-dropdown")).not.toBeInTheDocument();
      expect(createButton).toBeInTheDocument();

      fireEvent.click(createButton);
      expect(createFunction).toBeCalled();
    });

    test("Should render nothing when teamsAndUserProfiles is less than 2 and onlyShowWithTeams is true", () => {
      renderCreateButton({ onlyShowWithTeams: true });

      expect(screen.queryByTestId("create-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("create-button-dropdown")).not.toBeInTheDocument();
    });

    describe("Create Button Tests With Multiple Null Teams", () => {
      beforeAll(async () => {
        await runtimeMock([
          {
            teamId: null,
            name: "test",
            slug: "create-button-test",
            image: "image",
            readOnly: false,
          },
          {
            teamId: null,
            name: "test2",
            slug: "create-button-test2",
            image: "image2",
            readOnly: false,
          },
        ]);
      });

      test("Should render only the create-button button", () => {
        const createFunction = vi.fn();
        renderCreateButton({ createFunction });

        const createButton = screen.getByTestId("create-button");
        expect(screen.queryByTestId("create-button-dropdown")).not.toBeInTheDocument();
        expect(createButton).toBeInTheDocument();

        fireEvent.click(createButton);
        expect(createFunction).toBeCalled();
      });

      test("Should render nothing when teamsAndUserProfiles is greater than 1 and onlyShowWithNoTeams is true", () => {
        renderCreateButton({ onlyShowWithNoTeams: true });

        expect(screen.queryByTestId("create-button")).not.toBeInTheDocument();
        expect(screen.queryByTestId("create-button-dropdown")).not.toBeInTheDocument();
      });
    });
  });
});
