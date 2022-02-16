import { GraphQLClient, gql } from "graphql-request";
import getConfig from "next/config";

const { publicRuntimeConfig, serverRuntimeConfig } = getConfig();

export const checkIfRedeemCodeValid = async ({ redeemCode }: { redeemCode: string }) => {
  try {
    const graphQLClient = new GraphQLClient(publicRuntimeConfig.origins.ugraph, {
      headers: {
        Authorization: `Basic ${serverRuntimeConfig.ugraphAuthSecret}`,
      },
    });

    const query = gql`
      query GetRedeemableItemByRedeemCode($redeemCode: String!) {
        getRedeemableItemByRedeemCode(redeemCode: $redeemCode) {
          status
        }
      }
    `;
    const variables = {
      redeemCode,
    };

    console.log(
      "\n Authorization: `Basic ${serverRuntimeConfig.ugraphAuthSecret}`, \n",
      `Basic ${serverRuntimeConfig.ugraphAuthSecret}`,
      "\n"
    );
    const requestHeaders = {
      Authorization: `Basic ${serverRuntimeConfig.ugraphAuthSecret}`,
    };

    const response = await graphQLClient.request(query, variables, requestHeaders);
    console.log("\n response \n", response, "\n");

    if (response.getRedeemableItemByRedeemCode.status) {
      return true;
    }
    return false;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export const setRedeemableItemToBooked = async ({ redeemCode }: { redeemCode: string }) => {
  try {
    const graphQLClient = new GraphQLClient(publicRuntimeConfig.origins.ugraph, {
      headers: {
        Authorization: `Basic ${serverRuntimeConfig.ugraphAuthSecret}`,
      },
    });

    const query = gql`
      mutation SetRedeemableItemAsBooked($redeemCode: String!) {
        setRedeemableItemAsBooked(redeemCode: $redeemCode) {
          status
        }
      }
    `;
    const variables = {
      redeemCode,
    };

    const requestHeaders = {
      Authorization: `Basic ${serverRuntimeConfig.ugraphAuthSecret}`,
    };

    const response = await graphQLClient.request(query, variables, requestHeaders);
    console.log("\n response \n", response, "\n");
  } catch (err) {
    console.error(err);
  }
};
