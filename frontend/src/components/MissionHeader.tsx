"use client"

import { useRouter } from "next/navigation"

export default function MissionHeader() {
  const router = useRouter()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 bg-transparent shadow">
      <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "var(--font-geist-sans)" }}>
        MediDrop
      </h1>
      <div className="flex gap-4">
        <button
          className="px-4 py-2 bg-blue-800 text-white rounded-md shadow hover:bg-blue-900 transition"
          onClick={() => router.push("/")}
        >
          Home
        </button>
        <button
          className="px-4 py-2 bg-blue-800 text-white rounded-md shadow hover:bg-blue-900 transition"
          onClick={() => router.push("/dashboard")}
        >
          Dashboard
        </button>
      </div>
    </header>
  )
}