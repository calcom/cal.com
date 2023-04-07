import { GraphQLClient, gql } from "graphql-request";


interface ICreatePaywongPayment {
  amount: number;
  orderId: string;
  receiverAddress: string;
}

export const createPaywongPayment = async (
    input: ICreatePaywongPayment,
) => {
const endpoint = "https://api.paywong.com/v1/graphql";


  const graphQLClient = new GraphQLClient(endpoint, {
    headers: {
      authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGFpbXMiOnsieC1oYXN1cmEtYWxsb3dlZC1yb2xlcyI6WyJhcHAtcHVibGljIl0sIngtaGFzdXJhLWRlZmF1bHQtcm9sZSI6ImFwcC1wdWJsaWMiLCJ4LWhhc3VyYS1hcHAtaWQiOiJkMzE1YTgxNy00MmRlLTRlMzItOTZmMi1kMWYxNWQzNjJlNmEiLCJ4LWhhc3VyYS1hY2NvdW50LWlkIjoiUzdyRm8wRnpZIiwieC1oYXN1cmEtYXBwLXNhbHQiOiJiXy0ifSwiaWF0IjoxNjc5MDMzNTAyfQ.zl-UHhoM4-_mgEaDi3tIhkVojgkhGJiH5MAtB7CgDVY`,
    },
  });

  const mutation = gql`
    mutation createPayment(
      $amount: AmountInput!
      $items: [PaymentItemInput!]
      $paymentOptions: PaymentOptionsInput
      $receiverAddresses: [ReceiverAddressInput!]
    ) {
      createPayment(
        args: {
          amount: $amount
          paymentOptions: $paymentOptions
          receiverAddresses: $receiverAddresses
          items: $items
        }
      ) {
        paymentId
        paymentUrl
      }
    }
  `;

  const variables = {
    amount: {
      currencyId: "usd",
      amount: input.amount,
    },
    paymentOptions: {
      orderId: input.orderId,
    },
    receiverAddress: [1, 10, 56, 137, 43114].map((chainId) => ({ chainId, address: input.receiverAddress })),
    items: [
      {
        name: "Cal.com booking",
        price: input.amount,
        quantity: 1,
      },
    ],
  };

  try {
    const data = await graphQLClient.request(mutation, variables);
    return {
      success: true,
      data: {
        // @ts-ignore
        paymentId: data?.createPayment.paymentId,
        // @ts-ignore
        paymentUrl: data?.createPayment.paymentUrl,
      },
    };
  } catch (error: any) {
    console.error({ paywongErrors: error.response.errors });
    return {
      success: false,
      errors: error.response.errors,
    };
  }
};