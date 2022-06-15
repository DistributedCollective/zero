import React, { useState, useEffect, useCallback } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import { Button, Text, Box, Heading, Flex } from "theme-ui";
import { Card } from "./Card";

import {
  Percent,
  MINIMUM_COLLATERAL_RATIO,
  CRITICAL_COLLATERAL_RATIO,
  UserTrove,
  Decimal
} from "@sovryn-zero/lib-base";
import { BlockPolledLiquityStoreState } from "@sovryn-zero/lib-ethers";
import { useLiquitySelector } from "@sovryn-zero/lib-react";

import { shortenAddress } from "../utils/shortenAddress";
import { useLiquity } from "../hooks/LiquityContext";
import { COIN } from "../strings";

import { Icon } from "./Icon";
import { LoadingOverlay } from "./LoadingOverlay";
import { Transaction } from "./Transaction";
import { Tooltip } from "./Tooltip";
import { Abbreviation } from "./Abbreviation";

const liquidatableInNormalMode = (trove: UserTrove, price: Decimal) =>
  [trove.collateralRatioIsBelowMinimum(price), "Collateral ratio not low enough"] as const;

const liquidatableInRecoveryMode = (
  trove: UserTrove,
  price: Decimal,
  totalCollateralRatio: Decimal,
  zusdInStabilityPool: Decimal
) => {
  const collateralRatio = trove.collateralRatio(price);

  if (collateralRatio.gte(MINIMUM_COLLATERAL_RATIO) && collateralRatio.lt(totalCollateralRatio)) {
    return [
      trove.debt.lte(zusdInStabilityPool),
      "There's not enough ZUSD in the Stability pool to cover the debt"
    ] as const;
  } else {
    return liquidatableInNormalMode(trove, price);
  }
};

type RiskyTrovesProps = {
  pageSize: number;
};

const select = ({
  numberOfTroves,
  price,
  total,
  zusdInStabilityPool,
  blockTag
}: BlockPolledLiquityStoreState) => ({
  numberOfTroves,
  price,
  recoveryMode: total.collateralRatioIsBelowCritical(price),
  totalCollateralRatio: total.collateralRatio(price),
  zusdInStabilityPool,
  blockTag
});

export const RiskyTroves: React.FC<RiskyTrovesProps> = ({ pageSize }) => {
  const {
    blockTag,
    numberOfTroves,
    recoveryMode,
    totalCollateralRatio,
    zusdInStabilityPool,
    price
  } = useLiquitySelector(select);
  const { liquity } = useLiquity();

  const [loading, setLoading] = useState(true);
  const [troves, setTroves] = useState<UserTrove[]>();

  const [reload, setReload] = useState({});
  const forceReload = useCallback(() => setReload({}), []);

  const [page, setPage] = useState(0);
  const numberOfPages = Math.ceil(numberOfTroves / pageSize) || 1;
  const clampedPage = Math.min(page, numberOfPages - 1);

  const nextPage = () => {
    if (clampedPage < numberOfPages - 1) {
      setPage(clampedPage + 1);
    }
  };

  const previousPage = () => {
    if (clampedPage > 0) {
      setPage(clampedPage - 1);
    }
  };

  useEffect(() => {
    if (page !== clampedPage) {
      setPage(clampedPage);
    }
  }, [page, clampedPage]);

  useEffect(() => {
    let mounted = true;

    setLoading(true);

    liquity
      .getTroves(
        {
          first: pageSize,
          sortedBy: "ascendingCollateralRatio",
          startingAt: clampedPage * pageSize
        },
        { blockTag }
      )
      .then(troves => {
        if (mounted) {
          setTroves(troves);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
    // Omit blockTag from deps on purpose
    // eslint-disable-next-line
  }, [liquity, clampedPage, pageSize, reload]);

  useEffect(() => {
    forceReload();
  }, [forceReload, numberOfTroves]);

  const [copied, setCopied] = useState<string>();

  useEffect(() => {
    if (copied !== undefined) {
      let cancelled = false;

      setTimeout(() => {
        if (!cancelled) {
          setCopied(undefined);
        }
      }, 2000);

      return () => {
        cancelled = true;
      };
    }
  }, [copied]);

  return (
    <Box sx={{ width: "100%", mb: 3 }}>
      <Card>
        <Box sx={{ px: 10, pt: 2 }}>
          <Heading
            className="heading"
            sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}
          >
            <Abbreviation short="LoC">Risky Lines of Credit</Abbreviation>

            <Flex sx={{ alignItems: "center" }}>
              {numberOfTroves !== 0 && (
                <>
                  <Abbreviation
                    short={`page ${clampedPage + 1} / ${numberOfPages}`}
                    sx={{ mr: [0, 3], fontWeight: "body", fontSize: [1, 2], letterSpacing: [-1, 0] }}
                  >
                    {clampedPage * pageSize + 1}-
                    {Math.min((clampedPage + 1) * pageSize, numberOfTroves)} of {numberOfTroves}
                  </Abbreviation>

                  <Button
                    variant="titleIcon"
                    onClick={previousPage}
                    disabled={clampedPage <= 0}
                    sx={{ mr: "50px" }}
                  >
                    <Icon name="chevron-left" size="lg" />
                  </Button>

                  <Button
                    variant="titleIcon"
                    onClick={nextPage}
                    disabled={clampedPage >= numberOfPages - 1}
                    sx={{ mr: "40px" }}
                  >
                    <Icon name="chevron-right" size="lg" />
                  </Button>
                </>
              )}

              <Button
                variant="titleIcon"
                sx={{ opacity: loading ? 0 : 1, ml: [0, 3] }}
                onClick={forceReload}
              >
                <Icon name="redo" size="lg" />
              </Button>
            </Flex>
          </Heading>

          {!troves || troves.length === 0 ? (
            <Box sx={{ p: [2, 3] }}>
              <Box sx={{ p: 4, fontSize: 3, textAlign: "center" }}>
                {!troves ? "Loading..." : "There are no Lines of Credit yet"}
              </Box>
            </Box>
          ) : (
            <Box
              as="table"
              sx={{
                mt: 2,
                px: 2,
                width: "100%",
                textAlign: "center",
                lineHeight: 1.15,
                borderSpacing: "0 11px"
              }}
            >
              <colgroup>
                <col style={{ width: "50px" }} />
                <col />
                <col />
                <col />
                <col />
              </colgroup>

              <thead>
                <tr>
                  <th>Owner</th>
                  <th>
                    <Abbreviation short="Coll.">Collateral</Abbreviation>
                    <Text sx={{ ml: 2, fontSize: 12, fontWeight: "body", opacity: 0.5 }}>
                      (RBTC)
                    </Text>
                  </th>
                  <th>
                    Debt
                    <Text sx={{ ml: 2, fontSize: 12, fontWeight: "body", opacity: 0.5 }}>
                      ({COIN})
                    </Text>
                  </th>
                  <th>Collateral Ratio</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {troves.map(
                  trove =>
                    !trove.isEmpty && ( // making sure the Trove hasn't been liquidated
                      // (TODO: remove check after we can fetch multiple Troves in one call)
                      <tr key={trove.ownerAddress}>
                        <td>
                          <Flex
                            sx={{
                              alignItems: "center"
                            }}
                          >
                            <Tooltip message={trove.ownerAddress} placement="top">
                              <Text
                                variant="address"
                                sx={{
                                  width: ["73px", "unset"],
                                  overflow: "hidden",
                                  position: "relative"
                                }}
                              >
                                {shortenAddress(trove.ownerAddress)}
                                <Box
                                  sx={{
                                    display: ["block", "none"],
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                    width: "50px",
                                    height: "100%",
                                    background:
                                      "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)"
                                  }}
                                />
                              </Text>
                            </Tooltip>

                            <CopyToClipboard
                              text={trove.ownerAddress}
                              onCopy={() => setCopied(trove.ownerAddress)}
                            >
                              <Button variant="icon" sx={{ width: "24px", height: "24px" }}>
                                <Icon
                                  name={
                                    copied === trove.ownerAddress ? "clipboard-check" : "clipboard"
                                  }
                                  size="sm"
                                />
                              </Button>
                            </CopyToClipboard>
                          </Flex>
                        </td>
                        <td>
                          <Abbreviation short={trove.collateral.shorten()}>
                            {trove.collateral.prettify(4)}
                          </Abbreviation>
                        </td>
                        <td>
                          <Abbreviation short={trove.debt.shorten()}>
                            {trove.debt.prettify()}
                          </Abbreviation>
                        </td>
                        <td>
                          {(collateralRatio => (
                            <Text
                              color={
                                collateralRatio.gt(CRITICAL_COLLATERAL_RATIO)
                                  ? "success"
                                  : collateralRatio.gt(1.2)
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {new Percent(collateralRatio).prettify()}
                            </Text>
                          ))(trove.collateralRatio(price))}
                        </td>
                        <td>
                          <Transaction
                            id={`liquidate-${trove.ownerAddress}`}
                            tooltip="Liquidate"
                            requires={[
                              recoveryMode
                                ? liquidatableInRecoveryMode(
                                    trove,
                                    price,
                                    totalCollateralRatio,
                                    zusdInStabilityPool
                                  )
                                : liquidatableInNormalMode(trove, price)
                            ]}
                            send={liquity.send.liquidate.bind(liquity.send, trove.ownerAddress)}
                          >
                            <Button sx={{ ml: "auto" }} variant="dangerIcon">
                              <Icon name="trash" />
                            </Button>
                          </Transaction>
                        </td>
                      </tr>
                    )
                )}
              </tbody>
            </Box>
          )}

          {loading && <LoadingOverlay />}
        </Box>
      </Card>
    </Box>
  );
};
