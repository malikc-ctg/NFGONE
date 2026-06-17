"use client"

import React, { useRef } from "react"
import dynamic from "next/dynamic"
import { Input } from "@/components/ui/input"

const AddressAutofill = dynamic(
  () => import("@mapbox/search-js-react").then((mod) => mod.AddressAutofill),
  { ssr: false }
)

interface AddressAutocompleteProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onAddressSelect?: (address: {
    address_line1: string
    city: string
    state: string
    postal_code: string
  }) => void
  theme?: "light" | "dark"
}

export const AddressAutocomplete = React.forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  ({ onAddressSelect, theme = "light", className, value, onChange, ...props }, ref) => {
    const isSelecting = useRef(false)

    return (
      <AddressAutofill
        accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""}
        theme={{
          variables: {
            colorPrimary: "#3b82f6",
            colorBackground: theme === "dark" ? "#001a36" : "#ffffff",
            colorText: theme === "dark" ? "#ffffff" : "#0f172a",
            fontFamily: "inherit",
            borderRadius: "12px",
            boxShadow: theme === "dark" 
              ? "0 10px 25px -5px rgba(0, 0, 0, 0.5)" 
              : "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          },
        }}
        onRetrieve={(res) => {
          const feature = res.features[0]
          if (feature) {
            isSelecting.current = true
            const address = {
              address_line1: feature.properties.address_line1 || feature.properties.place_name || "",
              city: (feature.properties as any).address_level2 || (feature.properties as any).place || "",
              state: (feature.properties as any).address_level1 || (feature.properties as any).region || "",
              postal_code: feature.properties.postcode || "",
            }
            if (onAddressSelect) {
              onAddressSelect(address)
            }
            // Fire synthetic event for standard onChange handlers
            if (onChange) {
              const e = {
                target: { value: address.address_line1 },
              } as React.ChangeEvent<HTMLInputElement>
              onChange(e)
            }
          }
          setTimeout(() => {
            isSelecting.current = false
          }, 100)
        }}
      >
        <Input
          ref={ref}
          value={value}
          onChange={(e) => {
            if (onChange) onChange(e)
          }}
          autoComplete="address-line1"
          className={className}
          placeholder={props.placeholder || "Start typing your address..."}
          {...props}
        />
      </AddressAutofill>
    )
  }
)
AddressAutocomplete.displayName = "AddressAutocomplete"
