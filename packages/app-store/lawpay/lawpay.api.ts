import axios from "axios";

const LAWY_PAY_API = "https://api.lawpay.com/v1";

export const createLawPayCharge = async (token: string, amount: number, description: string) => {
  const response = await axios.post(
    `${LAWY_PAY_API}/charges`,
    {
      amount: amount * 100, // LawPay expects cents
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
