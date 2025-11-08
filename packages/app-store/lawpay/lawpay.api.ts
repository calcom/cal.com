// File: packages/app-store/lawpay/lawpay.api.ts
import axios from "axios";

const LAWY_PAY_API = "https://api.lawpay.com/v1";

export const createLawPayCharge = async (token: string, amount: number, description: string) => {
  // convert dollars to cents and round to avoid floating-point errors
  const amountInCents = Math.round(amount * 100);

  const response = await axios.post(
    `${LAWY_PAY_API}/charges`,
    {
      amount: amountInCents, // LawPay expects integer cents
      currency: "USD",
      description,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

export const getLawPayTransactions = async (token: string) => {
  const response = await axios.get(`${LAWY_PAY_API}/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
