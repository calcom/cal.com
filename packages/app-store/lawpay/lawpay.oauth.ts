import axios from "axios";

const LAWY_PAY_BASE = "https://api.lawpay.com/v1";

export const lawpayOAuthHandler = {
  authorizeUrl: "https://lawpay.com/oauth/authorize",
  tokenUrl: "https://lawpay.com/oauth/token",

  async getAccessToken(code: string, redirectUri: string) {
    const res = await axios.post(this.tokenUrl, {
      client_id: process.env.LAWPAY_CLIENT_ID,
      client_secret: process.env.LAWPAY_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
    return res.data;
  },
};
