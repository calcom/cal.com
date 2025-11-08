// File: packages/app-store/lawpay/lawpay.api.ts
import axios from "axios";

const LAWPAY_API = "https://api.lawpay.com/v1";

/**
 * Create a LawPay charge.
 *
 * @param token - OAuth or API Bearer token for LawPay
 * @param amount - Payment amount in dollars (will be converted to cents)
 * @param description - Description for the charge
 * @returns LawPay charge response
 */
export const createLawPayCharge = async (
  token: string,
  amount: number,
  description: string
) => {
  // ✅ Convert dollars to cents and round to whole cents
  const amountInCents = Math.round(amount * 100);

  try {
    const response = await axios.post(
      `${LAWPAY_API}/charges`,
      {
        amount: amountInCents, // LawPay expects integer cents
        currency: "USD",
        description,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("❌ LawPay charge creation failed:", (error as Error).message);
    throw error;
  }
};

/**
 * Retrieve LawPay transactions for the authenticated account.
 *
 * @param token - OAuth or API Bearer token for LawPay
 * @returns Array of transactions
 */
export const getLawPayTransactions = async (token: string) => {
  try {
    const response = await axios.get(`${LAWPAY_API}/transactions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("❌ Failed to fetch LawPay transactions:", (error as Error).message);
    throw error;
  }
};
