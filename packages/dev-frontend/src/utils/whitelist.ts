import axios, { AxiosResponse } from "axios";

enum WhitelistType {
  ZERO = "ZERO"
}

const whitelistClient = axios.create({
  baseURL: "https://whitelist.test.sovryn.app/whitelist/"
});

export const registerEmail = (email: string): Promise<AxiosResponse<any>> =>
  whitelistClient.post("register", {
    email,
    whitelistType: WhitelistType.ZERO
  });
