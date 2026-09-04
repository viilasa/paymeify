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
}: {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <Select name="currency" defaultValue={defaultValue} onValueChange={onValueChange}>
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
  );
}
