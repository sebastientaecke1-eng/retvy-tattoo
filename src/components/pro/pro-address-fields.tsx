"use client";

import type { ReactNode } from "react";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ProAddressValues = {
  address: string;
  city: string;
  postalCode: string;
};

type Props = ProAddressValues & {
  onAddressChange: (address: string) => void;
  onCityChange: (city: string) => void;
  onPostalCodeChange: (postalCode: string) => void;
  disabled?: boolean;
  addressRequired?: boolean;
  cityRequired?: boolean;
  /** `grid` : 3 cellules pour une grille parent (profil). `stack` : colonne (wizard). */
  layout?: "grid" | "stack";
  className?: string;
};

function FieldBlock({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export function isProAddressComplete(values: Pick<ProAddressValues, "address" | "city">): boolean {
  return Boolean(values.address.trim() && values.city.trim());
}

export function ProAddressFields({
  address,
  city,
  postalCode,
  onAddressChange,
  onCityChange,
  onPostalCodeChange,
  disabled,
  addressRequired = false,
  cityRequired = false,
  layout = "stack",
  className,
}: Props) {
  function handleSelect(selection: {
    address: string;
    city: string;
    postalCode: string;
  }) {
    onAddressChange(selection.address);
    onCityChange(selection.city);
    onPostalCodeChange(selection.postalCode);
  }

  const addressLabel = addressRequired ? "Adresse *" : "Adresse";
  const cityLabel = cityRequired ? "Ville *" : "Ville";

  const addressField = (
    <FieldBlock
      label={addressLabel}
      className={layout === "grid" ? "sm:col-span-2" : undefined}
    >
      <AddressAutocomplete
        value={address}
        onChange={onAddressChange}
        onSelect={handleSelect}
        required={addressRequired}
        disabled={disabled}
        placeholder="12 rue de Rivoli, Paris…"
      />
    </FieldBlock>
  );

  const postalField = (
    <FieldBlock label="Code postal">
      <Input
        value={postalCode}
        onChange={(e) => onPostalCodeChange(e.target.value)}
        inputMode="numeric"
        placeholder="75011"
        maxLength={5}
        disabled={disabled}
      />
    </FieldBlock>
  );

  const cityField = (
    <FieldBlock label={cityLabel}>
      <Input
        value={city}
        onChange={(e) => onCityChange(e.target.value)}
        required={cityRequired}
        disabled={disabled}
      />
    </FieldBlock>
  );

  if (layout === "grid") {
    return (
      <>
        {addressField}
        {postalField}
        {cityField}
      </>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {addressField}
      <div className="grid grid-cols-2 gap-3">
        {postalField}
        {cityField}
      </div>
    </div>
  );
}
