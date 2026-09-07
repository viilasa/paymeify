"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_DIAL_CODE,
  splitPhone,
} from "@/lib/phone";

export function PhoneInput({
  id = "client_phone",
  defaultValue,
}: {
  id?: string;
  defaultValue?: string | null;
}) {
  const parsed = splitPhone(defaultValue);
  const [dial, setDial] = React.useState(parsed.dial || DEFAULT_DIAL_CODE);

  return (
    <div className="flex">
      <input type="hidden" name="client_phone_code" value={dial} />
      <Select value={dial} onValueChange={setDial}>
        <SelectTrigger
          aria-label="Country code"
          className="h-11 w-27 shrink-0 rounded-r-none border-r-0 px-2.5 sm:h-9"
        >
          <SelectValue>{dial}</SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-[18rem]">
          {COUNTRY_DIAL_CODES.map((country) => (
            <SelectItem key={`${country.dial}-${country.name}`} value={country.dial}>
              {country.name} {country.dial}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        name="client_phone_number"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        defaultValue={parsed.national}
        placeholder="9876543210"
        maxLength={15}
        className="min-w-0 flex-1 rounded-l-none"
      />
    </div>
  );
}
