import { useMutation } from "@tanstack/react-query";
import axios from "axios";

// hook to update, save and delete oauth clients data
export const usePersistOAuthClient = () => {
  // return true;
  function createOAuthClient(body: any) {
    return axios.put("/api/v2/oauth-clients/", body);
  }

  useMutation(createOAuthClient, {
    onMutate: () => {
      console.log("Mutation happening");
    },
    onSuccess: () => {
      console.log("OAuth client created successfully");
    },
  });
};
