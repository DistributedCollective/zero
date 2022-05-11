import { Decimal } from "@sovryn-zero/lib-base";

type UniswapResponse = {
  data?: {
    bundle: {
      ethPrice: string;
    } | null;
    token: {
      derivedETH: string;
    } | null;
  };
  errors?: Array<{ message: string }>;
};

const uniswapQuery = (zeroTokenAddress: string) => `{
  token(id: "${zeroTokenAddress.toLowerCase()}") {
    derivedETH
  },
  bundle(id: 1) {
    ethPrice
  },
}`;

export async function fetchZeroPrice(zeroTokenAddress: string) {
  const response = await window.fetch("https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      query: uniswapQuery(zeroTokenAddress),
      variables: null
    })
  });
  if (!response.ok) {
    return Promise.reject("Network error connecting to Uniswap subgraph");
  }

  const { data, errors }: UniswapResponse = await response.json();

  if (errors) {
    return Promise.reject(errors);
  }

  if (typeof data?.token?.derivedETH === "string" && typeof data?.bundle?.ethPrice === "string") {
    const ethPriceUSD = Decimal.from(data.bundle.ethPrice);
    const zeroPriceUSD = Decimal.from(data.token.derivedETH).mul(ethPriceUSD);

    return { zeroPriceUSD };
  }

  return Promise.reject("Uniswap doesn't have the required data to calculate yield");
}
