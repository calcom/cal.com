import { defaultAvatarSrc, getPlaceholderAvatar } from "./defaultAvatarImage";

describe("Default Avatar Image tests", () => {
  describe("fn: defaultAvatarSrc", () => {
    it("should return a gravatar URL when an email is provided", () => {
      const email = "john@example.com";
      const result = defaultAvatarSrc({ email });

      expect(result).toEqual(
        "https://www.gravatar.com/avatar/d4c74594d841139328695756648b6bd6?s=160&d=mp&r=PG"
      );
    });

    it("should return a gravatar URL when an MD5 hash is provided", () => {
      const md5 = "my-md5-hash";
      const result = defaultAvatarSrc({ md5 });

      expect(result).toEqual("https://www.gravatar.com/avatar/my-md5-hash?s=160&d=mp&r=PG");
    });

    it("should return a gravatar URL using the MD5 hash when an email and MD5 hash are provided", () => {
      const email = "john@example.com";
      const md5 = "my-md5-hash";

      const result = defaultAvatarSrc({ email, md5 });

      expect(result).toEqual("https://www.gravatar.com/avatar/my-md5-hash?s=160&d=mp&r=PG");
    });

    it("should return an empty string when neither an email or MD5 hash is provided", () => {
      const result = defaultAvatarSrc({});

      expect(result).toEqual("");
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
