import { Decimal, LiquityStoreState } from "@sovryn-zero/lib-base";
import { useLiquitySelector } from "@sovryn-zero/lib-react";
import { useWeb3React } from "@web3-react/core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Flex, Heading, Text } from "theme-ui";
import { addresses } from "../../contracts/config";
import useTokenBalance from "../../hooks/useTokenBalance";
import useZusdAggregator from "../../hooks/useZusdAggregator";
import { COIN, XUSD } from "../../strings";
import { isZero, parseBalance } from "../../utils";
import { Card } from "../Card";
import { ErrorDescription } from "../ErrorDescription";
import { EditableRow } from "../Trove/Editor";

const select = ({ zusdBalance }: LiquityStoreState) => ({
  zusdBalance
});

export const Convert: React.FC = () => {
  const { account } = useWeb3React();
  const { zusdBalance } = useLiquitySelector(select);
  const { data: xusd, decimals: decimalsXUSD } = useTokenBalance(account!, addresses.xusd);
  const { data: zusd, decimals: decimalsZUSD } = useTokenBalance(
    addresses.babelfish,
    addresses.zusd
  );
  const { mint, redeem } = useZusdAggregator(account);

  const xusdBalance = useMemo(() => Decimal.from(parseBalance(xusd || 0, decimalsXUSD, decimalsXUSD)), [
    xusd,
    decimalsXUSD
  ]);

  const zusdAggregatorBalance = useMemo(() => Decimal.from(parseBalance(zusd || 0, decimalsZUSD, decimalsZUSD)), [
    decimalsZUSD,
    zusd
  ]);
  const maxXusdBalance = useMemo(() => Decimal.min(xusdBalance, zusdAggregatorBalance), [
    xusdBalance,
    zusdAggregatorBalance
  ]);

  const [zusdAmount, setZUSDAmount] = useState(zusdBalance);
  const [xusdAmount, setXUSDAmount] = useState(maxXusdBalance);
  const editingStateZUSD = useState<string>();
  const editingStateXUSD = useState<string>();
  const xusdEdited = useRef(false);

  const handleXusdAmount = useCallback(amount => {
    setXUSDAmount(Decimal.from(amount));
    xusdEdited.current = true;
  }, []);

  useEffect(() => {
    if (!xusdEdited.current) {
      setXUSDAmount(maxXusdBalance);
    }
  }, [maxXusdBalance]);

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
      <Flex sx={{ alignItems: "start", justifyContent: "space-around", py: 4 }}>
        <Flex sx={{ ml: 3, flexDirection: "column", fontWeight: 300, flex: 1 }}>
          <Text sx={{ fontWeight: 600, px: 2 }}>Convert ZUSD</Text>
          <EditableRow
            label="&nbsp;"
            inputId="convert-from-zusd"
            amount={zusdAmount.prettify()}
            unit={COIN}
            {...{ editingState: editingStateZUSD }}
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
            onClick={() => mint(zusdAmount.toString())}
            disabled={zusdAmount.isZero}
            sx={{ mt: zusdAmount.gt(zusdBalance) ? 1 : 3, ml: 2, alignSelf: "self-start" }}
          >
            Convert
          </Button>
        </Flex>

        <Flex sx={{ ml: 3, flexDirection: "column", fontWeight: 300, flex: 1 }}>
          <Text sx={{ fontWeight: 600, px: 2 }}>Convert XUSD</Text>
          <EditableRow
            label={`Aggregator Balance: ${zusdAggregatorBalance.prettify()} ${COIN}`}
            inputId="convert-from-xusd"
            amount={xusdAmount.prettify()}
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
            onClick={() => redeem(xusdAmount.toString())}
            disabled={isZero(xusdAmount.toString())}
            sx={{
              mt: xusdAmount.gt(xusdBalance) || xusdAmount.gt(zusdAggregatorBalance) ? 1 : 3,
              ml: 2,
              alignSelf: "self-start"
            }}
          >
            Convert
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
};
