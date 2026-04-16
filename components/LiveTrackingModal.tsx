"use client";
import { useEffect, useState, useMemo, useRef } from "react"; 
import { GoogleMap, DirectionsRenderer, Marker, useJsApiLoader } from '@react-google-maps/api';
import { showToast } from "@/lib/utils";

const libraries: ("places" | "geometry" | "maps")[] = ["places", "geometry", "maps"];

export default function LiveTrackingModal({ isOpen, onClose, order }: { isOpen: boolean, onClose: () => void, order: any }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [myPos, setMyPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [hasCentered, setHasCentered] = useState(false);

  const { customerPoint, isLocationValid } = useMemo(() => {
    const lat = Number(order?.locationCoords?.lat);
    const lng = Number(order?.locationCoords?.lng);
    const isDefault = lat === 15.5007 && lng === 32.5599;
    const isValid = lat && lng && !isDefault;
    return {
      customerPoint: { lat: lat || 15.5007, lng: lng || 32.5599 },
      isLocationValid: isValid
    };
  }, [order]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyCscTfT9KnGnoGj0dR96n8YbLFk5YdW2p0", // استبدله بمفتاحك
    libraries,
    language: 'ar',
    region: 'SD',
  });

  useEffect(() => {
    let watchId: number;
    if (isOpen && isLoaded && isLocationValid) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setPermissionError(false);
            const current = { lat: position.coords.latitude, lng: position.coords.longitude };
            setMyPos(current);

            // التوسيط التلقائي يحدث "مرة واحدة فقط" عند فتح الصفحة
            if (!hasCentered && mapRef.current) {
              const bounds = new google.maps.LatLngBounds();
              bounds.extend(current);
              bounds.extend(customerPoint);
              mapRef.current.fitBounds(bounds);
              setHasCentered(true);
            }

            const service = new google.maps.DirectionsService();
            service.route({
              origin: current,
              destination: customerPoint,
              travelMode: google.maps.TravelMode.DRIVING,
            }, (result, status) => {
              if (status === "OK") setDirections(result);
            });
          },
          (error) => { if (error.code === 1) setPermissionError(true); },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isOpen, isLoaded, isLocationValid, hasCentered]);

  // دالة إعادة التوسيط اليدوي (عندما يضغط السائق على الزر)
  const handleResetView = () => {
    if (mapRef.current && myPos) {
      mapRef.current.panTo(myPos);
      mapRef.current.setZoom(17);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col" dir="rtl">
      {/* الهيدر */}
      <div className="bg-[#1E293B] p-4 text-white flex justify-between items-center shrink-0 shadow-md">
          <div className="flex flex-col">
            <h3 className="font-black text-xs italic text-blue-400">تتبع مباشر 🛰️</h3>
            <span className="text-[8px] text-gray-400">يمكنك تحريك الخريطة بحرية الآن</span>
          </div>
          <button onClick={onClose} className="bg-red-500 px-4 py-2 rounded-xl text-[10px] font-black">إغلاق</button>
      </div>

      <div className="flex-1 relative">
        {isLoaded ? (
          <>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              // قمنا بإزالة خاصية center لكي لا تجبر الخريطة على العودة لمكان معين عند كل تحديث
              zoom={14}
              onLoad={(map) => { mapRef.current = map; }}
              options={{ 
                gestureHandling: "greedy", 
                disableDefaultUI: true,
                maxZoom: 19,
                minZoom: 5
              }}
            >
              {directions && (
                <DirectionsRenderer 
                  directions={directions} 
                  options={{
                    suppressMarkers: true,
                    preserveViewport: true, // يمنع القفز التلقائي عند تحديث الخط الأزرق
                    polylineOptions: { strokeColor: "#2563eb", strokeWeight: 6 }
                  }}
                />
              )}

              {myPos && (
                <Marker 
                  position={myPos} 
                  icon={{
                    url: "https://cdn-icons-png.flaticon.com/512/3774/3774278.png",
                    scaledSize: new google.maps.Size(40, 40)
                  }}
                />
              )}

              <Marker 
                position={customerPoint} 
                icon={{
                  url: "https://cdn-icons-png.flaticon.com/512/619/619153.png",
                  scaledSize: new google.maps.Size(40, 40)
                }}
              />
            </GoogleMap>

            {/* زر "موقعي الآن" - مهم جداً لإعادة التوسيط بعد أن يحرك السائق الخريطة بيده */}
            <button 
              onClick={handleResetView} 
              className="absolute bottom-32 left-6 bg-white p-4 rounded-full shadow-2xl border border-gray-200 active:scale-90 transition-all z-[210]"
            >
              <span className="text-xl">🎯</span>
            </button>

            {/* بطاقة المعلومات السفلى */}
            {directions && (
              <div className="absolute bottom-8 left-4 right-4 bg-white/95 backdrop-blur-md p-5 rounded-[25px] shadow-2xl flex justify-between items-center border border-blue-50">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 font-bold">المسافة متبقية</span>
                    <span className="text-sm font-black text-blue-600">{directions.routes[0].legs[0].distance?.text}</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] text-gray-400 font-bold">زمن الوصول</span>
                    <span className="text-sm font-black text-slate-800">{directions.routes[0].legs[0].duration?.text}</span>
                  </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">جاري التحميل...</div>
        )}
      </div>
    </div>
  );
}
