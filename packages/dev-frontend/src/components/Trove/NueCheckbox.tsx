import React from "react";
import { Checkbox, CheckboxProps, Label } from "@theme-ui/components";

export type NueCheckboxProps = Pick<CheckboxProps, "checked" | "onChange">;

export const NueCheckbox: React.FC<NueCheckboxProps> = ({
  checked,
  onChange
}) => (
  <Label sx={{ display: "flex" }}>
    <Checkbox checked={checked} onChange={onChange} />
    Use NUE
  </Label>
)
