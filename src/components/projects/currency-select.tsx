"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_CURRENCIES } from "@/lib/format";

export function CurrencySelect({
  defaultValue = "INR",
  onValueChange,
  disabled = false,
}: {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <>
      {/* A disabled select isn't submitted, so post the fixed value instead. */}
      {disabled ? <input type="hidden" name="currency" value={defaultValue} /> : null}
      <Select
        name={disabled ? undefined : "currency"}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger id="currency" aria-label="Currency">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_CURRENCIES.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
