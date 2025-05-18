"use client"
import MissionForm from "../../components/MissionForm"
import MissionHeader from "../../components/MissionHeader"
import { useRouter } from "next/navigation"

export default function FormPage() {
  const router = useRouter()

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center bg-gray-50"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-[90vw] pt-8">
        <MissionHeader />
      </div>

      <div className="w-[90vw] flex-1 bg-white bg-opacity-90 rounded-lg shadow-lg mb-8 mt-12 pt-8">
        <MissionForm onClose={() => router.push("/dashboard")} />
      </div>

      <p className="text-xs text-gray-500 text-center mb-8">
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
