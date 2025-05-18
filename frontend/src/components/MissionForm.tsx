"use client"

import type React from "react"

import { useState } from "react"
import dynamic from "next/dynamic"
import KitSelector from "./KitSelector"
import { useMapEvents } from "react-leaflet"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Dynamically import only components
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false })
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false })

type MissionFormProps = {
  onClose: () => void
}
type Location = { lat: string; long: string }

function LocationPicker({
  location,
  setLocation,
  route,
}: {
  location: Location
  setLocation: (loc: Location) => void
  route: Location[]
}) {
  // Ask for location on mount
  useEffect(() => {
    if (!location.lat && !location.long && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({
          lat: pos.coords.latitude.toFixed(6),
          long: pos.coords.longitude.toFixed(6),
        })
      })
    }
  }, [location.lat, location.long, setLocation])

  // Custom marker handler
  const MarkerSetter = () => {
    useMapEvents({
      click(e: { latlng: { lat: number; lng: number } }) {
        setLocation({
          lat: e.latlng.lat.toFixed(6),
          long: e.latlng.lng.toFixed(6),
        })
      },
    })
    return null
  }

  // Convert route to numbers for polyline
  const routePoints: [number, number][] = route.map((point) => [Number(point.lat), Number(point.long)] as [number, number])

  return (
    <div className="h-64 w-full mb-4 rounded-md overflow-hidden cursor-pointer">
      <MapContainer
        center={[location.lat ? Number(location.lat) : 0, location.long ? Number(location.long) : 0]}
        zoom={location.lat && location.long ? 13 : 2}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MarkerSetter />
        {location.lat && location.long && <Marker position={[Number(location.lat), Number(location.long)]} />}
        {/* Display route points as markers */}
        {route.map((point, index) => (
          <Marker key={`route-point-${index}`} position={[Number(point.lat), Number(point.long)]} />
        ))}
        {/* Display route as a line */}
        {routePoints.length > 1 && <Polyline positions={routePoints} color="blue" />}
      </MapContainer>
    </div>
  )
}

export default function MissionForm({ onClose }: MissionFormProps) {
  const [location, setLocation] = useState({ lat: "", long: "" })
  const [route, setRoute] = useState<{ lat: string; long: string }[]>([])
  const [selectedKit, setSelectedKit] = useState("")
  const [missionName, setMissionName] = useState("New Mission")
  // Remove isSubmitting state
  // const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const addPointToRoute = () => {
    if (location.lat && location.long) {
      setRoute([...route, { lat: location.lat, long: location.long }])
      // Don't clear location to allow for easier sequential point adding
    }
  }

  const removePointFromRoute = (index: number) => {
    const newRoute = [...route]
    newRoute.splice(index, 1)
    setRoute(newRoute)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (route.length < 1 || !selectedKit) {
      alert("Please add at least one route point and select a kit.");
      return;
    }

    const firstPoint = route[0];
    router.push(
      `/dashboard?lat=${firstPoint.lat}&long=${firstPoint.long}&kit=${encodeURIComponent(selectedKit)}`
    );
    onClose();
  };

  return (
    <form className="bg-white p-8 rounded-lg shadow-md flex flex-col gap-6 w-full max-w-none" onSubmit={handleSubmit}>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <div className="mb-4">
            <label className="block font-semibold mb-2 text-gray-900">Mission Name</label>
            <input
              type="text"
              className="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              required
            />
          </div>

          <label className="block font-semibold mb-2 text-gray-900">Location</label>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              className="border rounded-md px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={location.lat}
              onChange={(e) => setLocation({ ...location, lat: e.target.value })}
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              className="border rounded-md px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={location.long}
              onChange={(e) => setLocation({ ...location, long: e.target.value })}
            />
            <button
              type="button"
              onClick={addPointToRoute}
              className="px-3 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition"
            >
              Add Point
            </button>
          </div>
          <LocationPicker location={location} setLocation={setLocation} route={route} />

          {/* Display route points */}
          {route.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Route Points ({route.length})</h3>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                {route.map((point, index) => (
                  <div key={index} className="flex justify-between items-center mb-1 text-sm">
                    <span>
                      Point {index + 1}: {point.lat}, {point.long}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePointFromRoute(index)}
                      className="text-red-500 hover:text-red-700 px-2 py-1 rounded-md"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1">
          <KitSelector value={selectedKit} onChange={setSelectedKit} />
        </div>
      </div>
      <button
        type="submit"
        className="px-6 py-3 bg-blue-800 text-white rounded-md shadow hover:bg-blue-900 transition disabled:bg-blue-300"
        disabled={route.length < 1 || !selectedKit}
      >
        Start Mission
      </button>
    </form>
  )
}
