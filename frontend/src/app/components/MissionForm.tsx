"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import KitSelector from "./KitSelector";
import { useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";

// Dynamically import only components
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false });

type MissionFormProps = {
  onClose: () => void;
};

const allProducts = [
  "Bandages",
  "Water Bottles",
  "Blanket",
  "Painkillers",
  "Electrolyte Powder",
  "Sleeping Bag",
  "Flashlight",
  "Antiseptic Wipes",
];

function LocationPicker({ location, setLocation }: any) {
  // Ask for location on mount
  useEffect(() => {
    if (!location.lat && !location.long && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({
          lat: pos.coords.latitude.toFixed(6),
          long: pos.coords.longitude.toFixed(6),
        });
      });
    }
  }, [location.lat, location.long, setLocation]);

  // Custom marker handler
  const MarkerSetter = () => {
    // @ts-ignore
    useMapEvents({
      click(e: { latlng: { lat: number; lng: number; }; }) {
        setLocation({
          lat: e.latlng.lat.toFixed(6),
          long: e.latlng.lng.toFixed(6),
        });
      },
    });
    return null;
  };

  return (
    <div className="h-64 w-full mb-4 rounded overflow-hidden">
      <MapContainer
        center={[location.lat ? Number(location.lat) : 0, location.long ? Number(location.long) : 0]}
        zoom={location.lat && location.long ? 13 : 2}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerSetter />
        {location.lat && location.long && (
          <Marker position={[Number(location.lat), Number(location.long)]} />
        )}
      </MapContainer>
    </div>
  );
}

export default function MissionForm({ onClose }: MissionFormProps) {
  const [location, setLocation] = useState({ lat: "", long: "" });
  const [kit, setKit] = useState("");
  const [customProducts, setCustomProducts] = useState<string[]>([]);

  const handleCheckbox = (product: string) => {
    setCustomProducts((prev) =>
      prev.includes(product)
        ? prev.filter((p) => p !== product)
        : [...prev, product]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // handle submit logic here
    onClose();
  };

  return (
    <form
      className="bg-white p-8 rounded-lg shadow-md flex flex-col gap-6 w-full max-w-none"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <label className="block font-semibold mb-2">Location</label>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              className="border rounded px-2 py-1 w-32"
              value={location.lat}
              onChange={(e) =>
                setLocation({ ...location, lat: e.target.value })
              }
              required
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              className="border rounded px-2 py-1 w-32"
              value={location.long}
              onChange={(e) =>
                setLocation({ ...location, long: e.target.value })
              }
              required
            />
          </div>
          <LocationPicker location={location} setLocation={setLocation} />
        </div>
        <div className="flex-1">
          <KitSelector />
        </div>
      </div>
      <button
        type="submit"
        className="px-6 py-3 bg-blue-800 text-white rounded-lg shadow hover:bg-blue-900 transition"
      >
        Start mission
      </button>
    </form>
  );
}