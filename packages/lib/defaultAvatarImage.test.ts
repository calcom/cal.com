import { describe, expect, it } from "vitest";

import { defaultAvatarSrc, getPlaceholderAvatar } from "./defaultAvatarImage";

describe("Default Avatar Image tests", () => {
  describe("fn: defaultAvatarSrc", () => {
    it("should return a ui-avatar URL when a name is provided", () => {
      const name = "John Doe";
      const result = defaultAvatarSrc(name);

      expect(result).toEqual(
        "https://eu.ui-avatars.com/api/?color=f9f9f9&bold=true&background=000000&name=John%20Doe"
      );
    });

    it("should return a ui-avatars URL with a default value when an empty string is provided", () => {
      const result = defaultAvatarSrc(null);

      expect(result).toEqual(
        "https://eu.ui-avatars.com/api/?color=f9f9f9&bold=true&background=000000&name=Nameless"
      );
    });
  });

  describe("fn: getPlaceholderAvatar", () => {
    it("should return the avatar URL when one is provided", () => {
      const avatar = "https://example.com/avatar.png";
      const name = "John Doe";

      const result = getPlaceholderAvatar(avatar, name);

      expect(result).toEqual(avatar);
    });

    it("should return a placeholder avatar URL when no avatar is provided", () => {
      const name = "John Doe";

      const result = getPlaceholderAvatar(null, name);

      expect(result).toEqual(
        "https://eu.ui-avatars.com/api/?background=fff&color=f9f9f9&bold=true&background=000000&name=John%20Doe"
      );
    });

    it("should return a placeholder avatar URL when no avatar is provided and no name is provided", () => {
      const result = getPlaceholderAvatar(null, null);

      expect(result).toEqual(
        "https://eu.ui-avatars.com/api/?background=fff&color=f9f9f9&bold=true&background=000000&name="
      );
    });
  });
});
