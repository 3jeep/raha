"use client";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// إعداد أيقونة الدبوس
const customIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconShadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center[0] && center[1]) map.setView(center, 16);
  }, [center, map]);
  return null;
}

export default function MapComponent({ mapCenter, setProfile, profile }: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // دالة البحث عن الموقع باستخدام اسم المنطقة
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLon = parseFloat(lon);

        // تحديث الملف الشخصي وتغيير مركز الخريطة
        setProfile((prev: any) => ({
          ...prev,
          latitude: newLat,
          longitude: newLon,
        }));
      } else {
        alert("لم يتم العثور على المنطقة، حاول كتابة الاسم بشكل أدق (مثلاً: الخرطوم، المعمورة)");
      }
    } catch (error) {
      console.error("Search Error:", error);
      alert("حدث خطأ أثناء البحث، تأكد من اتصال الإنترنت");
    } finally {
      setIsSearching(false);
    }
  };

  function MapEvents() {
    useMapEvents({
      click(e) {
        setProfile((prev: any) => ({
          ...prev,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        }));
      },
    });
    return null;
  }

  return (
    <div className="w-full h-full relative">
      {/* شريط البحث العلوي */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] z-[1000]">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن منطقة (مثلاً: الرياض، الخرطوم)..."
            className="w-full p-4 pr-12 rounded-2xl border-none shadow-2xl text-[11px] font-black outline-none bg-white text-gray-800"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-2 bg-[#1E293B] text-white p-2.5 rounded-xl active:scale-90 transition-all"
          >
            {isSearching ? "⏳" : "🔍"}
          </button>
        </form>
      </div>

      <MapContainer center={mapCenter} zoom={16} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={[profile?.latitude || mapCenter[0], profile?.longitude || mapCenter[1]]} />
        <MapEvents />
        {profile?.latitude && profile?.longitude && (
          <Marker position={[profile.latitude, profile.longitude]} icon={customIcon} />
        )}
      </MapContainer>
    </div>
  );
}
