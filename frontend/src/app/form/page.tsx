"use client";
import MissionForm from "../components/MissionForm";

export default function FormPage() {
  return (
    <div
      className="w-full h-screen flex flex-col items-center justify-center bg-gray-50"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-[90vw] h-[90vh] flex bg-white bg-opacity-80 rounded-lg shadow-lg">
        <MissionForm onClose={() => {}} />
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
  );
}