export default function Header() {
  return (
    <header className="bg-black text-white flex items-center px-6 py-4">
      {/* MBTA Logo with Inverted Colors */}
      <div className="mr-4">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/MBTA.svg/1024px-MBTA.svg.png"
          alt="MBTA Logo"
          className="w-10 h-10 invert" // Apply the CSS class
        />
      </div>
      <h1 className="text-lg font-semibold">
        Massachusetts Bay Transportation Authority
      </h1>
    </header>
  );
}
