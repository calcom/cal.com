import Web3 from "web3";

const verifyAccount = async (signature, address) => {
  const web3 = new Web3();
  const signingAddress = await web3.eth.accounts.recover(process.env.NEXT_PUBLIC_WEB3_AUTH_MSG, signature);
  if (!(address.toLowerCase() === signingAddress.toLowerCase())) throw new Error("Failed to verify address");
};

export default verifyAccount;
