import axios, { AxiosResponse } from "axios";

enum WhitelistType {
  ZERO = "ZERO"
}

const whitelistClient = axios.create({
  baseURL: "https://whitelist.sovryn.app/"
});

export const registerEmail = (email: string, ref: string): Promise<AxiosResponse<any>> =>
  whitelistClient.post("register/" + WhitelistType.ZERO, {
    email,
    ref
  });

export const checkAccountAccess = (account: string): Promise<AxiosResponse<any>> =>
  whitelistClient.get(`${WhitelistType.ZERO}/${account}`);

export const activateAccount = (
  account: string,
  email: string,
  code: string
): Promise<AxiosResponse<any>> =>
  whitelistClient.post(`activate/${WhitelistType.ZERO}/${account}`, {
    email,
    code
  });
