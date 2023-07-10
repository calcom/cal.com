/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable playwright/missing-playwright-await */
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { beforeAll, vi } from "vitest";

import { Avatar, sizesPropsBySize } from "./Avatar";
import { AvatarGroup } from "./AvatarGroup";

type sizeKeys = "xxs" | "xs" | "xsm" | "sm" | "md" | "mdLg" | "lg" | "xl";

vi.mock("@radix-ui/react-avatar", async () => {
  const ImageMock = (props: { [key: string]: string; alt: string }) => {
    return <img {...props} alt={props.alt} />;
  };
  const actual = (await vi.importActual("@radix-ui/react-avatar")) as { default: object };
  return {
    ...actual.default,
    Image: ImageMock,
  };
});

const observeMock = vi.fn();

window.ResizeObserver = vi.fn().mockImplementation(() => ({
  disconnect: vi.fn(),
  observe: observeMock,
  unobserve: vi.fn(),
}));

vi.mock("../tooltip", async () => {
  const actual = (await vi.importActual("../tooltip")) as any;
  const TooltipMock = (props: object) => {
    const [open, setOpen] = useState(false);

    return (
      <actual.Tooltip
        {...props}
        open={open}
        onOpenChange={(isOpen: boolean) => {
          setOpen(isOpen);
        }}
      />
    );
  };
  return {
    Tooltip: TooltipMock,
  };
});

const restoreRadix = async () => {
  const mockedLib = (await import("@radix-ui/react-avatar")) as any;
  const actualLib = (await vi.importActual("@radix-ui/react-avatar")) as any;
  mockedLib.Image = actualLib.default.Image;
};

const forcedWaitFor = async () => {
  await waitFor(
    async () => {
      await new Promise((r) => setTimeout(r, 1000));
    },
    { timeout: 2000 }
  );
};

const alt = "Avatar";
const src = "image.jpg";
const link = "google.com";
describe("Tests for Avatar component", () => {
  test("Should render image with correct props", () => {
    const { container } = render(<Avatar alt={alt} size="md" imageSrc={src} />);

    const avatarImg = container.querySelector("img");
    expect(avatarImg).toHaveAttribute("alt", alt);
    expect(avatarImg).toHaveAttribute("src", src);
  });

  test("Should acept custom class names", () => {
    render(<Avatar alt={alt} size="md" className="custom-class" />);

    const avatarContainer = screen.getByTestId("avatar");
    expect(avatarContainer).toHaveClass("custom-class");
  });

  test("Should render accepted icon", () => {
    render(<Avatar alt={alt} size="lg" accepted />);

    expect(screen.getByTestId("accepted-icon-container")).toBeInTheDocument();
  });

  test("Should render inside a link", () => {
    const { container } = render(<Avatar alt={alt} size="md" href={link} />);
    const avatarContainer = screen.getByTestId("avatar");
    const anchorElement = container.querySelector(`a[href="${link}"]`);
    expect(anchorElement?.firstChild).toEqual(avatarContainer);
  });

  test("Should render title tooltip", () => {
    render(<Avatar alt={alt} size="md" title="Hello World" />);
    const avatarContainer = screen.getByTestId("avatar");
    expect(avatarContainer.getAttribute("data-state")).toEqual("closed");
    act(() => {
      fireEvent.focus(avatarContainer);
    });
    expect(avatarContainer.getAttribute("data-state")).toEqual("instant-open");
    expect(observeMock).toBeCalledWith(avatarContainer);
  });

  test.each(Object.keys(sizesPropsBySize))("Should render with correct class names for size: %s", (size) => {
    render(<Avatar alt={alt} size={size as sizeKeys} />);
    const avatarContainer = screen.getByTestId("avatar");
    expect(avatarContainer).toHaveClass(sizesPropsBySize[size as sizeKeys]);
  });
});

describe("Tests for AvatarGroup component", () => {
  const items = [
    {
      image: "image0.jpg",
      alt: "Avatar 0",
      href: link,
    },
    {
      image: "image1.jpg",
      alt: "Avatar 1",
      href: link,
    },
    {
      image: "image2.jpg",
      alt: "Avatar 2",
      href: link,
    },
  ];

  test("Should render all items", () => {
    render(<AvatarGroup size="sm" items={items} />);
    const avatarItems = screen.getByTestId("avatar-group").querySelectorAll("li");
    expect(avatarItems?.length).toEqual(3);

    avatarItems?.forEach((avatar, index) => {
      const avatarImg = avatar.querySelector("img");
      expect(avatarImg).toHaveAttribute("alt", items[index].alt);
      expect(avatarImg).toHaveAttribute("src", items[index].image);
    });
  });

  test("Should acept custom class names", () => {
    render(<AvatarGroup size="sm" items={items} className="custom-class" />);
    const avatarList = screen.getByTestId("avatar-group");
    expect(avatarList).toHaveClass("custom-class");
  });

  test("Should render accepted icon", () => {
    render(<AvatarGroup size="sm" items={items} accepted />);
    const avatarItems = screen.getByTestId("avatar-group").querySelectorAll("li");
    avatarItems?.forEach((avatar) => {
      expect(avatar.querySelector('[data-testid="accepted-icon-container"]')).toBeInTheDocument();
    });
  });

  test("Should render inside a link", () => {
    render(<AvatarGroup size="sm" items={items} />);
    const avatarItems = screen.getByTestId("avatar-group").querySelectorAll("li");
    avatarItems?.forEach((avatar) => {
      const avatarContainer = avatar.querySelector('[data-testid="avatar"]');
      const anchorElement = avatar.querySelector(`a[href="${link}"]`);
      expect(anchorElement?.firstChild).toEqual(avatarContainer);
    });
  });

  test("Should truncate after the second avatar", () => {
    render(<AvatarGroup size="sm" items={items} truncateAfter={2} />);
    const lastItem = Array.from(screen.getByTestId("avatar-group").querySelectorAll("li")).slice(-1)[0];
    const spanWithTruncateNumber = screen.getByText("+1");
    expect(lastItem).toEqual(spanWithTruncateNumber.parentElement);
  });
});

describe("Tests for Avatar fallback", () => {
  beforeAll(async () => {
    await restoreRadix();
  });

  test("Should render fallback", async () => {
    render(<Avatar alt={alt} size="md" fallback={<p>Fallback</p>} />);
    await forcedWaitFor();
    expect(screen.getByText("Fallback")).toBeInTheDocument();
  });

  test("Should render gravatarFallback", async () => {
    const { container } = render(<Avatar alt={alt} size="md" gravatarFallbackMd5="Ui@CAL.com" />);
    await forcedWaitFor();

    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "https://www.gravatar.com/avatar/Ui@CAL.com"
    );
  });
});
