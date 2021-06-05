const crypto = require('crypto');

function sha256(input: string): string {
  return crypto
      .createHash('sha256')
      .update(input)
      .digest("hex");
}

export default sha256;