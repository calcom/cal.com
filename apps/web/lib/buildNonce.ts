const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/*
The buildNonce array allows a randomly generated 22-unsigned-byte array
and returns a 24-ASCII character string that mimics a base64-string.
*/

export const buildNonce = (uint8array: Uint8Array): string => {
  // the random uint8array should contain 22 bytes
  // 22 bytes mimic the base64-encoded 16 bytes
  // base64 encodes 6 bits (log2(64)) with 8 bits (64 allowed characters)
  // thus ceil(16*8/6) gives us 22 bytes
  if (uint8array.length != 22) {
    return "";
  }

  // for each random byte, we take:
  // a) only the last 6 bits (so we map them to the base64 alphabet)
  // b) for the last byte, we are interested in two bits
  // explanation:
  // 16*8 bits = 128 bits of information (order: left->right)
  // 22*6 bits = 132 bits (order: left->right)
  // thus the last byte has 4 redundant (least-significant, right-most) bits
  // it leaves the last byte with 2 bits of information before the redundant bits
  // so the bitmask is 0x110000 (2 bits of information, 4 redundant bits)
  const bytes = uint8array.map((value, i) => {
    if (i < 20) {
      return value & 0b111111;
    }

    return value & 0b110000;
  });

  const nonceCharacters: string[] = [];

  bytes.forEach((value) => {
    nonceCharacters.push(BASE64_ALPHABET.charAt(value));
  });

  // base64-encoded strings can be padded with 1 or 2 `=`
  // since 22 % 4 = 2, we pad with two `=`
  nonceCharacters.push("==");

  // the end result has 22 information and 2 padding ASCII characters = 24 ASCII characters
  return nonceCharacters.join("");
};
