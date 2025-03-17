import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-black text-white flex items-center px-6 py-4">
      {/* MBTA Logo with Inverted Colors */}
      <div className="mr-4">
        <Image
          src={`/icons/icon-circle-t-default.svg`}
          alt="MBTA Logo"
          className="w-10 h-10 invert" // Apply the CSS class
          width={10}
          height={10}
        />
      </div>
      <h1 className="text-lg font-semibold">
        Massachusetts Bay Transportation Authority
      </h1>
    </header>
  );
}
