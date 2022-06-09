import { Decimal } from "@sovryn-zero/lib-base";
import React, { useMemo, useState } from "react";
import { Text, Flex, Label, Input, SxProp, Button, ThemeUICSSProperties } from "theme-ui";

import { Icon } from "../Icon";

type RowProps = SxProp & {
  label: string;
  labelId?: string;
  labelFor?: string;
  infoIcon?: React.ReactNode;
};

export const Row: React.FC<RowProps> = ({ sx, label, labelId, labelFor, children, infoIcon }) => {
  return (
    <Flex sx={{ flexDirection: "column", ...sx }}>
      <Label
        id={labelId}
        htmlFor={labelFor}
        sx={{
          p: 0,
          pt: 1,
          fontSize: 1,
          border: 1,
          borderColor: "transparent"
        }}
      >
        <Flex sx={{ alignItems: "center" }}>
          {label}
          {infoIcon && infoIcon}
        </Flex>
      </Label>
      {children}
    </Flex>
  );
};

type PendingAmountProps = {
  value: string;
};

const PendingAmount: React.FC<PendingAmountProps & SxProp> = ({ sx, value }) => (
  <Text {...{ sx }}>
    (
    {value === "++" ? (
      <Icon name="angle-double-up" />
    ) : value === "--" ? (
      <Icon name="angle-double-down" />
    ) : value?.startsWith("+") ? (
      <>
        <Icon name="angle-up" /> {value.substr(1)}
      </>
    ) : value?.startsWith("-") ? (
      <>
        <Icon name="angle-down" /> {value.substr(1)}
      </>
    ) : (
      value
    )}
    )
  </Text>
);

type StaticAmountsProps = {
  inputId: string;
  labelledBy?: string;
  amount: string;
  unit?: string;
  color?: string;
  pendingAmount?: string;
  pendingColor?: string;
  showTilde?: boolean;
  onClick?: () => void;
};

export const StaticAmounts: React.FC<StaticAmountsProps & SxProp> = ({
  sx,
  inputId,
  labelledBy,
  amount,
  unit,
  color,
  pendingAmount,
  pendingColor,
  showTilde,
  onClick,
  children
}) => {
  return (
    <Flex
      id={inputId}
      aria-labelledby={labelledBy}
      {...{ onClick }}
      sx={{
        justifyContent: "space-between",
        alignItems: "center",

        ...(onClick ? { cursor: "text" } : {}),

        ...staticStyle,
        ...sx
      }}
    >
      <Flex sx={{ alignItems: "center", width: "100%", pr: 2 }}>
        {showTilde && <Text sx={{ fontWeight: "light", opacity: 0.8, flexShrink: 0 }}>~&nbsp;</Text>}
        <Text sx={{ color, fontWeight: "medium", textOverflow: "ellipsis", overflow: "hidden" }}>
          {amount}
        </Text>
        {unit && (
          <Text sx={{ fontWeight: "light", opacity: 0.8, flexShrink: 0, flexGrow: 0 }}>
            &nbsp;{unit}
          </Text>
        )}

        {pendingAmount && (
          <PendingAmount
            sx={{
              color: pendingColor,
              opacity: 0.8,
              fontSize: "0.666em",
              flexShrink: 0,
              flexGrow: 0
            }}
            value={pendingAmount}
          />
        )}
      </Flex>

      {children}
    </Flex>
  );
};

const staticStyle: ThemeUICSSProperties = {
  flexGrow: 1,

  mb: 0,
  px: "8px",

  fontSize: 3,

  border: 1,
  borderColor: "transparent"
};

const editableStyle: ThemeUICSSProperties = {
  py: 2,

  fontSize: 4,

  boxShadow: [1, 2],
  border: 1,
  borderColor: "muted"
};

type StaticRowProps = RowProps & StaticAmountsProps;

export const StaticRow: React.FC<StaticRowProps> = ({
  label,
  labelId,
  labelFor,
  infoIcon,
  ...props
}) => (
  <Row {...{ label, labelId, labelFor, infoIcon }} sx={{ mt: [-2, -3], pb: [2, 3] }}>
    <StaticAmounts {...props} />
  </Row>
);

type DisabledEditableRowProps = Omit<StaticAmountsProps, "labelledBy" | "onClick"> & {
  label: string;
};

export const DisabledEditableRow: React.FC<DisabledEditableRowProps> = ({
  inputId,
  label,
  unit,
  amount,
  color,
  pendingAmount,
  pendingColor
}) => (
  <Row labelId={`${inputId}-label`} {...{ label, labelFor: inputId, unit }} sx={{ flex: 1, px: 2 }}>
    <Flex sx={{ alignItems: "center", position: "relative", mt: "4px" }}>
      <StaticAmounts
        sx={{
          ...editableStyle,
          borderRadius: 8
        }}
        labelledBy={`${inputId}-label`}
        {...{ inputId, amount, unit, color, pendingAmount, pendingColor }}
      />
    </Flex>
  </Row>
);

type EditableRowProps = DisabledEditableRowProps & {
  editingState: [string | undefined, (editing: string | undefined) => void];
  editedAmount: string;
  setEditedAmount: (editedAmount: string) => void;
  maxAmount?: string;
  maxedOut?: boolean;
};

export const EditableRow: React.FC<EditableRowProps> = ({
  label,
  inputId,
  unit,
  amount,
  color,
  pendingAmount,
  pendingColor,
  editingState,
  editedAmount,
  setEditedAmount,
  maxAmount,
  maxedOut
}) => {
  const [editing, setEditing] = editingState;
  const [invalid, setInvalid] = useState(false);

  const showTilde = useMemo(() => !Decimal.from(editedAmount).eq(amount.replaceAll(",", "")), [
    amount,
    editedAmount
  ]);

  return editing === inputId ? (
    <Row {...{ label, labelFor: inputId, unit }} sx={{ flex: 1, px: 2, maxWidth: 355 }}>
      <Flex sx={{ alignItems: "center", position: "relative", mt: "4px" }}>
        <Input
          autoFocus
          id={inputId}
          type="number"
          step="any"
          defaultValue={editedAmount}
          {...{ invalid }}
          onChange={e => {
            try {
              setEditedAmount(e.target.value);
              setInvalid(false);
            } catch {
              setInvalid(true);
            }
          }}
          onBlur={() => {
            setEditing(undefined);
            setInvalid(false);
          }}
          variant="editor"
          sx={{
            ...editableStyle,
            borderRadius: 8,
            fontWeight: "medium",
            bg: invalid ? "danger" : "transparent",
            outline: "none"
          }}
        />
      </Flex>
    </Row>
  ) : (
    <Row
      labelId={`${inputId}-label`}
      {...{ label, labelFor: inputId, unit }}
      sx={{ flex: 1, px: 2, maxWidth: 355 }}
    >
      <Flex sx={{ alignItems: "center", justifyContent: "space-around", mt: "4px" }}>
        <StaticAmounts
          sx={{
            ...editableStyle,
            borderRadius: 8,
            bg: invalid ? "invalid" : "transparent",
            flex: 1,
            flexShrink: 1,
            flexGrow: 1
          }}
          labelledBy={`${inputId}-label`}
          onClick={() => setEditing(inputId)}
          {...{ inputId, amount, unit, color, pendingAmount, pendingColor, invalid, showTilde }}
        >
          {maxAmount && (
            <Button
              sx={{ fontSize: 1, p: 1, px: 3, flexShrink: 0, flexGrow: 0 }}
              onClick={event => {
                setEditedAmount(maxAmount);
                event.stopPropagation();
              }}
              disabled={maxedOut}
            >
              max
            </Button>
          )}
        </StaticAmounts>
      </Flex>
    </Row>
  );
};
