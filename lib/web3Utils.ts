import { Web3Provider } from "@ethersproject/providers";
import { ethers } from "ethers";

export const validJson = (jsonString: string) => {
  try {
    const o = JSON.parse(jsonString);
    if (o && typeof o === "object") {
      return o;
    }
  } catch (e) {
    console.log("Invalid JSON:", e);
  }
  return false;
};

export const getContractBalance = async (
  contractAddress: string,
  walletAddress: string,
  provider: Web3Provider
) => {
  // TODO: need to make this more robust. potentially fetch (and cache/store) abi
  // when contract is added to event type settings
  const abi = ["function balanceOf(address owner) view returns (uint256)"];

  // TODO: the provider should be passed via web3React. not working right now, but
  // using the ethers defaultProvider is purely for testing!
  const contract = new ethers.Contract(contractAddress, abi, provider || ethers.getDefaultProvider());

  const balance = await contract.balanceOf(walletAddress);
  return balance.toNumber();
};
