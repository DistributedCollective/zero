import { Decimal, LiquityStoreState } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";
import { parseUnits } from "ethers/lib/utils";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Flex, Heading, Text } from "theme-ui";
import { addresses } from "../../contracts/config";
import useTokenBalance from "../../hooks/useTokenBalance";
import useZusdAggregator from "../../hooks/useZusdAggregator";
import { COIN, XUSD } from "../../strings";
import { parseBalance } from "../../utils";
import { Card } from "../Card";
import { useConnectorContext } from "../Connector";
import { ErrorDescription } from "../ErrorDescription";
import { EditableRow } from "../Trove/Editor";

const select = ({ zusdBalance }: LiquityStoreState) => ({
  zusdBalance
});

export const Convert: React.FC = () => {
  const { walletAddress } = useConnectorContext();
  const { zusdBalance } = useLiquitySelector(select);
  const { data: xusd, decimals: decimalsXUSD } = useTokenBalance(walletAddress!, addresses.xusd);
  const { data: zusd, decimals: decimalsZUSD } = useTokenBalance(
    addresses.babelfish,
    addresses.zusd
  );
  const { mint, redeem } = useZusdAggregator(walletAddress);

  const xusdBalance = useMemo(
    () => Decimal.from(parseBalance(xusd || 0, decimalsXUSD, decimalsXUSD)),
    [xusd, decimalsXUSD]
  );

  const zusdAggregatorBalance = useMemo(
    () => Decimal.from(parseBalance(zusd || 0, decimalsZUSD, decimalsZUSD)),
    [decimalsZUSD, zusd]
  );
  const maxXusdBalance = useMemo(() => Decimal.min(xusdBalance, zusdAggregatorBalance), [
    xusdBalance,
    zusdAggregatorBalance
  ]);

  const [zusdAmount, setZUSDAmount] = useState(zusdBalance);
  const [xusdAmount, setXUSDAmount] = useState(maxXusdBalance);
  const editingStateZUSD = useState<string>();
  const editingStateXUSD = useState<string>();
  const xusdEdited = useRef(false);
  const showConvertFromZUSD = false; //hardcoded whilst ZUSD deposits to XUSD aggregator are paused, can be switched for contract call check in future
  const handleXusdAmount = useCallback(amount => {
    setXUSDAmount(Decimal.from(amount));
    xusdEdited.current = true;
  }, []);

  useEffect(() => {
    if (!xusdEdited.current) {
      setXUSDAmount(maxXusdBalance);
    }
  }, [maxXusdBalance]);

  const isRedeemDisabled = useMemo(
    () =>
      xusdAmount.lte(0) ||
      xusdAmount.gt(xusdBalance) ||
      (xusdAmount.lte(xusdBalance) && xusdAmount.gt(zusdAggregatorBalance)),
    [xusdAmount, xusdBalance, zusdAggregatorBalance]
  );

  const handleMintClick = useCallback(() => {
    const amount = parseUnits(zusdAmount.toString());
    const balance = parseUnits(zusdBalance.toString());
    mint((balance.lte(amount) ? balance : amount).toString());
  }, [mint, zusdBalance, zusdAmount]);

  const handleRedeemClick = useCallback(() => {
    const amount = parseUnits(xusdAmount.toString(), 18);
    const balance = parseUnits(maxXusdBalance.toString());
    redeem((balance.lte(amount) ? balance : amount).toString());
  }, [redeem, maxXusdBalance, xusdAmount]);

  return (
    <Card
      heading={
        <>
          <Heading className="heading">Convert</Heading>
          <Heading as="h3" className="subheading">
            Convert ZUSD to XUSD and XUSD to ZUSD at 1:1 ratio
          </Heading>
        </>
      }
    >
      <Flex
        sx={{
          flexDirection: ["column", "row"],
          alignItems: "start",
          justifyContent: "space-around",
          py: 4,
          gap: 2
        }}
      >
        <Flex sx={{ ml: 3, flexDirection: "column", fontWeight: 300, flex: 1 }}>
          <Text sx={{ fontWeight: 600, px: 2 }}>Convert ZUSD</Text>
          {showConvertFromZUSD ? (
            <>
              <EditableRow
                label="&nbsp;"
                inputId="convert-from-zusd"
                amount={zusdAmount.prettify()}
                value={zusdAmount}
                unit={COIN}
                editingState={editingStateZUSD}
                editedAmount={zusdAmount.toString(18)}
                setEditedAmount={amount => setZUSDAmount(Decimal.from(amount))}
                maxAmount={zusdBalance.toString()}
                maxedOut={zusdAmount.gte(zusdBalance)}
              />
              {zusdAmount.gt(zusdBalance) && (
                <Flex sx={{ mt: 3 }}>
                  <ErrorDescription>Amount exceeds address balance.</ErrorDescription>
                </Flex>
              )}
              <Button
                onClick={handleMintClick}
                disabled={zusdAmount.isZero || zusdAmount.gt(zusdBalance)}
                sx={{
                  mt: 3,
                  ml: 2,
                  alignSelf: "self-start"
                }}
                data-action-id="zero-convert-ZUSD"
              >
                Convert
              </Button>
            </>
          ) : (
            <Text sx={{ pt: 1, px: 2 }}>This feature is currently disabled.</Text>
          )}
        </Flex>

        <Flex sx={{ ml: 3, flexDirection: "column", fontWeight: 300, flex: 1 }}>
          <Text sx={{ fontWeight: 600, px: 2 }}>Convert XUSD</Text>
          <EditableRow
            label={`Aggregator Balance: ${zusdAggregatorBalance.prettify()} ${COIN}`}
            inputId="convert-from-xusd"
            amount={xusdAmount.prettify()}
            value={xusdAmount}
            unit={XUSD}
            {...{ editingState: editingStateXUSD }}
            editedAmount={xusdAmount.toString(18)}
            setEditedAmount={handleXusdAmount}
            maxAmount={maxXusdBalance.toString()}
            maxedOut={xusdAmount.gte(maxXusdBalance)}
          />
          {xusdAmount.gt(xusdBalance) && (
            <Flex sx={{ mt: 3 }}>
              <ErrorDescription>Amount exceeds address balance.</ErrorDescription>
            </Flex>
          )}
          {xusdAmount.lte(xusdBalance) && xusdAmount.gt(zusdAggregatorBalance) && (
            <Flex sx={{ mt: 3 }}>
              <ErrorDescription>Amount exceeds aggregator balance.</ErrorDescription>
            </Flex>
          )}
          <Button
            onClick={handleRedeemClick}
            disabled={isRedeemDisabled}
            sx={{
              mt: 3,
              ml: 2,
              alignSelf: "self-start"
            }}
            data-action-id="zero-convert-XUSD"
          >
            Convert
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};
