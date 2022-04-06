import React, { useMemo, useCallback } from "react";
import { Text, Flex, Image } from "theme-ui";
import blockies from "ethereum-blockies";
import { useWeb3React } from "@web3-react/core";
import { Web3Provider } from "@ethersproject/providers";

import { useLiquity } from "../hooks/LiquityContext";
import { shortenAddress } from "../utils/shortenAddress";

export const UserAddress: React.FC = () => {
  const { account } = useLiquity();
  const { deactivate } = useWeb3React<Web3Provider>();

  const blockieImage = useMemo(() => {
    return blockies
      .create({
        // All options are optional
        seed: account, // seed used to generate icon data, default: random
        color: "#dfe", // to manually specify the icon color, default: random
        bgcolor: "#aaa", // choose a different background color, default: random
        size: 8, // width/height of the icon in blocks, default: 8
        scale: 3, // width/height of each block in pixels, default: 4
        spotcolor: 13 // each pixel has a 13% chance of being of a third color,
      })
      .toDataURL();
  }, [account]);

  const logout = useCallback(deactivate, [deactivate]);

  return (
    <Flex bg="darkGray" sx={{ borderRadius: "5px", overflow: "hidden" }}>
      <Flex sx={{ alignItems: "center" }}>
        <Flex sx={{ px: 10, py: 1, alignItems: "center" }}>
          <Text as="span" sx={{ fontSize: 2, mr: 13, fontWeight: 600 }}>
            {shortenAddress(account, 4)}
          </Text>
          <Image sx={{ borderRadius: "50%", height: 22 }} src={blockieImage} alt="wallet address" />
        </Flex>
      </Flex>
      <Flex
        bg="darkGray2"
        sx={{ justifyItems: "center", alignItems: "center", px: 10, py: 1, cursor: "pointer" }}
        onClick={logout}
      >
        <svg fill="#fec004" data-icon="log-out" width="20" viewBox="0 0 16 16">
          <desc>log-out</desc>
          <path
            d="M7 14H2V2h5c.55 0 1-.45 1-1s-.45-1-1-1H1C.45 0 0 .45 0 1v14c0 .55.45 1 1 1h6c.55 0 1-.45 1-1s-.45-1-1-1zm8.71-6.71l-3-3a1.003 1.003 0 00-1.42 1.42L12.59 7H6c-.55 0-1 .45-1 1s.45 1 1 1h6.59l-1.29 1.29c-.19.18-.3.43-.3.71a1.003 1.003 0 001.71.71l3-3c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71z"
            fillRule="evenodd"
          ></path>
        </svg>
      </Flex>
    </Flex>
  );
};
