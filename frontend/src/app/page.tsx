"use client"
import { useRouter } from "next/navigation"
import MissionHeader from "../components/MissionHeader"

export default function Home() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen flex flex-col items-center p-8 pb-20 sm:p-20"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-6xl">
        <MissionHeader />
      </div>

      <div className="flex-1 flex flex-col items-center justify-between max-w-3xl text-center w-full">
        <h2
          className="text-3xl md:text-4xl font-bold text-gray-900 mt-8"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          Emergency Medical Supply Delivery
        </h2>

        {/* Description can go here if needed */}

        <button
          className="px-8 py-4 bg-blue-800 text-white text-lg rounded-lg shadow-lg hover:bg-blue-900 transition mb-8"
          onClick={() => router.push("/form")}
        >
          Start New Mission
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center mt-8">
        Photo by{" "}
        <a
          href="https://unsplash.com/@asoggetti?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Alessio Soggetti
        </a>{" "}
        on{" "}
        <a
          href="https://unsplash.com/photos/turned-on-drone-rSFxBGpnluw?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Unsplash
        </a>
        . Free to use under the Unsplash License.
      </p>
    </div>
  )
}
