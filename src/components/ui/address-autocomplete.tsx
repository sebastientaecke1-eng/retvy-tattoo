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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!showSuggestions) {
      setDebouncedQuery("");
      return;
    }

    const timer = window.setTimeout(() => setDebouncedQuery(value), 300);
    return () => window.clearTimeout(timer);
  }, [value, showSuggestions]);

  useEffect(() => {
    if (!showSuggestions || debouncedQuery.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void searchGouvAddresses(debouncedQuery)
      .then((results) => {
        if (cancelled) return;
        setSuggestions(results);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, showSuggestions]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
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
    setShowSuggestions(false);
    setSuggestions([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => {
            const nextValue = e.target.value;
            onChange(nextValue);
            if (nextValue.trim().length >= 3) {
              setShowSuggestions(true);
            } else {
              setShowSuggestions(false);
              setSuggestions([]);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setShowSuggestions(false), 150);
          }}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showSuggestions && suggestions.length > 0}
        />
        {loading && showSuggestions && (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500"
            aria-hidden
          />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
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
