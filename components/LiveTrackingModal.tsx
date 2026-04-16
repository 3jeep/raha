"use client";
import { useEffect, useState, useMemo, useRef } from "react"; 
import { GoogleMap, DirectionsRenderer, Marker, useJsApiLoader } from '@react-google-maps/api';

// نقل التعريفات خارج المكون لمنع إعادة التقديم (Re-rendering)
const libraries: ("places" | "geometry" | "maps")[] = ["places", "geometry", "maps"];
const mapContainerStyle = { width: '100%', height: '100%' };

export default function LiveTrackingModal({ isOpen, onClose, order }: { isOpen: boolean, onClose: () => void, order: any }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [myPos, setMyPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [hasCentered, setHasCentered] = useState(false);

  // حساب إحداثيات العميل
  const { customerPoint, isLocationValid } = useMemo(() => {
    const lat = Number(order?.locationCoords?.lat);
    const lng = Number(order?.locationCoords?.lng);
    const isValid = lat && lng && lat !== 15.5007; // التأكد من أنها ليست الإحداثيات الافتراضية
    return {
      customerPoint: { lat: lat || 15.5007, lng: lng || 32.5599 },
      isLocationValid: isValid
    };
  }, [order]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyCscTfT9KnGnoGj0dR96n8YbLFk5YdW2p0", // تأكد من تفعيل Billing و Maps JS API
    libraries,
    language: 'ar',
  });

  useEffect(() => {
    let watchId: number;
    if (isOpen && isLoaded && isLocationValid) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const current = { lat: position.coords.latitude, lng: position.coords.longitude };
            setMyPos(current);

            // التوسيط التلقائي عند أول مرة فقط
            if (!hasCentered && mapRef.current) {
              const bounds = new google.maps.LatLngBounds();
              bounds.extend(current);
              bounds.extend(customerPoint);
              mapRef.current.fitBounds(bounds);
              setHasCentered(true);
            }

            // رسم المسار
            const service = new google.maps.DirectionsService();
            service.route({
              origin: current,
              destination: customerPoint,
              travelMode: google.maps.TravelMode.DRIVING,
            }, (result, status) => {
              if (status === "OK") setDirections(result);
            });
          },
          (error) => console.error("Geolocation error:", error),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [isOpen, isLoaded, isLocationValid, hasCentered, customerPoint]);

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
      <div className="bg-[#1E293B] p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex flex-col">
            <h3 className="font-black text-sm italic text-blue-400">تتبع مباشر 🛰️</h3>
            <span className="text-[10px] text-gray-400">يتم تحديث موقعك الآن تلقائياً</span>
          </div>
          <button onClick={onClose} className="bg-red-500 px-5 py-2 rounded-2xl text-xs font-black active:scale-90 transition-transform">إغلاق</button>
      </div>

      <div className="flex-1 relative bg-slate-100">
        {isLoaded ? (
          <>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              zoom={15}
              center={customerPoint} // الحـــل: تحديد مركز الخريطة عند التحميل لمنع اللون الرمادي
              onLoad={(map) => { mapRef.current = map; }}
              options={{ 
                gestureHandling: "greedy", 
                disableDefaultUI: true,
              }}
            >
              {directions && (
                <DirectionsRenderer 
                  directions={directions} 
                  options={{
                    suppressMarkers: true,
                    preserveViewport: true,
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

            <button 
              onClick={handleResetView} 
              className="absolute bottom-32 left-6 bg-white p-4 rounded-full shadow-2xl border border-gray-100 z-[210] active:scale-90 transition-all"
            >
              🎯
            </button>

            {directions && (
              <div className="absolute bottom-8 left-4 right-4 bg-white/95 backdrop-blur-md p-5 rounded-[30px] shadow-2xl flex justify-between items-center border border-blue-50 z-[210]">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">المسافة</span>
                    <span className="text-lg font-black text-blue-600">{directions.routes[0].legs[0].distance?.text}</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">الزمن المقدر</span>
                    <span className="text-lg font-black text-slate-800">{directions.routes[0].legs[0].duration?.text}</span>
                  </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-sm italic">جاري تهيئة الخريطة...</p>
            {loadError && <p className="text-red-500 text-xs text-center">خطأ في التحميل: {loadError.message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
