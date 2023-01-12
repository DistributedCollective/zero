import axios, { AxiosResponse } from "axios";
import { isMainnet } from ".";

enum WhitelistType {
  ZERO = "ZERO"
}

const whitelistClient = axios.create({
  baseURL: isMainnet ? "https://whitelist.sovryn.app/" : "https://whitelist.test.sovryn.app/"
});

export const registerEmail = (
  email: string,
  ref: string,
  sovrynMail: boolean,
  token: string
): Promise<AxiosResponse<any>> =>
  whitelistClient.post("register/" + WhitelistType.ZERO, {
    email,
    ref,
    sovrynMail: !!sovrynMail,
    token
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

export const confirmUser = (ref: string): Promise<AxiosResponse<any>> =>
  whitelistClient.post(`confirm/${WhitelistType.ZERO}/${ref}`);
