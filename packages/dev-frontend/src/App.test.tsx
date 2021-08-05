import React from "react";
import { render, fireEvent } from "@testing-library/react";

import { Decimal, ZUSD_MINIMUM_NET_DEBT, Trove } from "@liquity/lib-base";

import App from "./App";

const params = { depositCollateral: Decimal.from(20), borrowZUSD: ZUSD_MINIMUM_NET_DEBT };
const trove = Trove.create(params);

console.log(`${trove}`);

/*
 * Just a quick and dirty testcase to prove that the approach can work in our CI pipeline.
 */
test("there's no smoke", async () => {
  const { getByText, getAllByText, getByLabelText, findByText } = render(<App />);

  expect(await findByText(/you can borrow zusd by opening a trove/i)).toBeInTheDocument();

  fireEvent.click(getByText(/open trove/i));
  fireEvent.click(getByLabelText(/collateral/i));
  fireEvent.change(getByLabelText(/^collateral$/i), { target: { value: `${trove.collateral}` } });
  fireEvent.click(getByLabelText(/^borrow$/i));
  fireEvent.change(getByLabelText(/^borrow$/i), { target: { value: `${trove.debt}` } });

  const confirmButton = getAllByText(/confirm/i)[0];
  fireEvent.click(confirmButton);

  expect(await findByText(/adjust/i)).toBeInTheDocument();
});
