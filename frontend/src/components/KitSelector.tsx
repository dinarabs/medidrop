"use client"

import type React from "react"
import { useState, useEffect } from "react"

const kitDescriptions: Record<string, string> = {
  "first aid kit": "Includes Bandages, Gauze, Painkillers, Antiseptic Wipes, Emergency Blanket, Gloves.",
  "hydration kit":
    "Includes Collapsible Water Pouch (500ml), Electrolyte Powder Sachet, Water-Filter Straw, and Energy-Electrolyte Gel Packet.",
  "shelter kit":
    "Includes Mylar Emergency Blanket, Compact Bivy Sack, Lightweight Tarp or Poncho, Mini Trekking Poles or Collapsible Stakes, Hand Warmers/Heat Packs, Signal Mirror, and Whistle.",
}

const allProducts: string[] = Array.from(
  new Set(
    Object.values(kitDescriptions).flatMap((desc) =>
      desc
        .replace(/^Includes\s*/i, "")
        .split(",")
        .map((item) => item.replace(/\.$/, "").trim())
        .flatMap((item) => item.split(" and ").map((i) => i.replace(/^and\s+/i, "").trim())),
    ),
  ),
)

type KitSelectorProps = {
  value: string
  onChange: (kit: string) => void
}

const KitSelector: React.FC<KitSelectorProps> = ({ value, onChange }) => {
  const [kit, setKit] = useState<string>(value || "")
  const [customProducts, setCustomProducts] = useState<string[]>([])

  // Update parent component when kit changes
  useEffect(() => {
    if (kit) {
      onChange(kit)
    }
  }, [kit, onChange])

  const handleCheckbox = (product: string) => {
    setCustomProducts((prev) => (prev.includes(product) ? prev.filter((p) => p !== product) : [...prev, product]))
  }

  return (
    <div>
      <label className="block font-semibold mb-2">Kit</label>
      <select
        className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={kit}
        onChange={(e) => setKit(e.target.value)}
        required
      >
        <option value="" disabled>
          Select a kit
        </option>
        <option value="first aid kit">First Aid Kit</option>
        <option value="hydration kit">Hydration Kit</option>
        <option value="shelter kit">Shelter Kit</option>
        <option value="customize">Customize</option>
      </select>
      {kit && kit !== "customize" && <div className="mt-4 text-gray-400 text-sm italic">{kitDescriptions[kit]}</div>}
      {kit === "customize" && (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            {allProducts.map((product: string) => (
              <label key={product} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded-md"
                  checked={customProducts.includes(product)}
                  onChange={() => handleCheckbox(product)}
                />
                {product}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default KitSelector
