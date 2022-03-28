import React from "react";
import { Checkbox, CheckboxProps, Label } from "@theme-ui/components";

export type NueCheckboxProps = Pick<CheckboxProps, "checked" | "onChange">;

export const NueCheckbox: React.FC<NueCheckboxProps> = ({ checked, onChange }) => (
  <Label
    sx={{ display: "inline-flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}
  >
    <Checkbox checked={checked} onChange={onChange} />
    Use NUE
  </Label>
);
