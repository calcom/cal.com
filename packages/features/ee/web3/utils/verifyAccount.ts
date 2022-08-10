import Web3 from "web3";

export const AUTH_MESSAGE =
  "I authorize the use of my Ethereum address for the purposes of this application.";

const verifyAccount = async (signature: string, address: string) => {
  const web3 = new Web3();
  const signingAddress = await web3.eth.accounts.recover(AUTH_MESSAGE, signature);
  if (!(address.toLowerCase() === signingAddress.toLowerCase())) throw new Error("Failed to verify address");
};

export default verifyAccount;
