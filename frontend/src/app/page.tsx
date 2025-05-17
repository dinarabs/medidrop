"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex flex-col justify-between items-center p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <header className="w-full flex flex-col items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontSize: "2.75rem" }}>
          MediDrop
        </h1>
        <button
          className="mt-15 px-6 py-3 bg-blue-800 text-white rounded-lg shadow hover:bg-blue-900 transition"
          onClick={() => router.push("/form")}
        >
          New Mission
        </button>
      </header>
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