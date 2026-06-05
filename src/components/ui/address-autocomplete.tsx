"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  searchGouvAddresses,
  type GouvAddressFeature,
} from "@/lib/address/gouv-api";
import { Input } from "@/components/ui/input";

export type AddressSelection = {
  address: string;
  city: string;
  postalCode: string;
};

type Props = {
  value: string;
  onChange: (address: string) => void;
  onSelect: (selection: AddressSelection) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  required,
  disabled,
  placeholder = "12 rue de Rivoli…",
}: Props) {
  const [suggestions, setSuggestions] = useState<GouvAddressFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(value), 300);
    return () => window.clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (debouncedQuery.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void searchGouvAddresses(debouncedQuery)
      .then((results) => {
        if (cancelled) return;
        setSuggestions(results);
        setOpen(results.length > 0);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions([]);
        setOpen(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  function pick(feature: GouvAddressFeature) {
    const { name, city, postcode } = feature.properties;
    onSelect({
      address: name,
      city,
      postalCode: postcode,
    });
    onChange(name);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value.trim().length >= 3) setOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
        />
        {loading && (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500"
            aria-hidden
          />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-zinc-700 bg-zinc-950 py-1 shadow-lg"
        >
          {suggestions.map((feature, index) => (
            <li key={feature.properties.id ?? `${feature.properties.label}-${index}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-900"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(feature)}
              >
                {feature.properties.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
