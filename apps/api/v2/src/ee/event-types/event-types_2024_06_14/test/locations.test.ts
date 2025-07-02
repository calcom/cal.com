import { describe, expect, it } from "vitest";

import { transformLocationsInternalToApi } from "../transformers/internal-to-api/locations";
import type { InternalLocation } from "../transformers/internal/locations";

describe("Location transformation", () => {
  it("should correctly transform link location type", () => {
    const internalLocations: InternalLocation[] = [
      {
        type: "link",
        link: "https://example.com/meeting",
        displayLocationPublicly: true,
      },
    ];

    const result = transformLocationsInternalToApi(internalLocations);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "link",
      link: "https://example.com/meeting",
      public: true,
    });
  });

  it("should handle link location without displayLocationPublicly", () => {
    const internalLocations: InternalLocation[] = [
      {
        type: "link",
        link: "https://example.com/meeting",
      },
    ];

    const result = transformLocationsInternalToApi(internalLocations);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      type: "link",
      link: "https://example.com/meeting",
      public: false,
    });
  });

  it("should not create unknown location for valid link type", () => {
    const internalLocations: InternalLocation[] = [
      {
        type: "link",
        link: "https://example.com/meeting",
        displayLocationPublicly: false,
      },
    ];

    const result = transformLocationsInternalToApi(internalLocations);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("link");
    expect(result[0].type).not.toBe("unknown");
  });

  it("should handle mixed location types correctly", () => {
    const internalLocations: InternalLocation[] = [
      {
        type: "inPerson",
        address: "123 Main St",
        displayLocationPublicly: true,
      },
      {
        type: "link",
        link: "https://example.com/meeting",
        displayLocationPublicly: false,
      },
      {
        type: "userPhone",
        hostPhoneNumber: "+1234567890",
        displayLocationPublicly: true,
      },
    ];

    const result = transformLocationsInternalToApi(internalLocations);

    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("address");
    expect(result[1].type).toBe("link");
    expect(result[2].type).toBe("phone");
  });
});
