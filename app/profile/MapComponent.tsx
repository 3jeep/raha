"use client";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

// إعداد أيقونة الدبوس (Marker Icon) لتعمل بشكل صحيح في المتصفح
const customIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconShadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// مكون لتغيير مركز الخريطة برمجياً
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 16);
  }, [center, map]);
  return null;
}

export default function MapComponent({ mapCenter, setProfile, profile }: any) {
  // التقاط نقرة المستخدم على الخريطة لتثبيت الدبوس
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
    <div className="w-full h-full min-h-[300px]">
      <MapContainer center={mapCenter} zoom={16} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={mapCenter} />
        <MapEvents />
        {profile?.latitude && profile?.longitude && (
          <Marker position={[profile.latitude, profile.longitude]} icon={customIcon} />
        )}
      </MapContainer>
    </div>
  );
}
