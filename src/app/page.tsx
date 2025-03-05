import Map from '../components/Map';
import Header from '../components/Header';

export default function HomePage() {
  return (
    <main className="w-screen h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 relative">
        <Map />
      </div>
    </main>
  );
}
