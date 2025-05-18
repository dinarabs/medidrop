"use client"

import { useSearchParams } from "next/navigation"
import MissionHeader from "../../components/MissionHeader"
import DroneTracker from "../../components/DroneTracker"

export default function DashboardPage() {
  const params = useSearchParams()
  const lat = params.get("lat")
  const long = params.get("long")
  const kit = params.get("kit")
  const missionId = params.get("missionId") // Or however you get the missionId

  return (
    <div
      className="min-h-screen bg-gray-50 p-8"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <MissionHeader />

      <div className="bg-white rounded-lg shadow p-6 bg-opacity-90 mt-24">
        <h2 className="text-2xl font-bold mb-4">Mission Dashboard</h2>
        <p className="text-gray-700 mb-4">
          Welcome to your drone mission dashboard. Here you can view and manage all your missions.
        </p>

        {lat && long ? (
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Current Mission</h3>
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-gray-800">
                  <div className="font-medium text-gray-500">Latitude</div>
                  <div className="font-mono">{lat}</div>
                </div>
                <div className="text-gray-800">
                  <div className="font-medium text-gray-500">Longitude</div>
                  <div className="font-mono">{long}</div>
                </div>
                <div className="text-gray-800">
                  <div className="font-medium text-gray-500">Kit Type</div>
                  <div className="capitalize">{kit}</div>
                </div>
              </div>

              {/* Place DroneTracker here */}
              {missionId && (
                <div className="mt-6">
                  <DroneTracker missionId={missionId} />
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                  Cancel Mission
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 italic p-4 bg-gray-50 rounded-md">No active mission data available.</div>
        )}

        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-3">Mission History</h3>
          <div className="text-gray-400 italic p-4 bg-gray-50 rounded-md">No previous missions found.</div>
        </div>
      </div>
    </div>
  )
}