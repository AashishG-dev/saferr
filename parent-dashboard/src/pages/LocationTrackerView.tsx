import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, History, Shield, RefreshCw } from 'lucide-react';
import L from 'leaflet';
import { LocationPoint } from '../types';

interface LocationTrackerViewProps {
  deviceId: string;
  locations: LocationPoint[];
  onRefreshLocation: () => void;
}

export const LocationTrackerView: React.FC<LocationTrackerViewProps> = ({
  deviceId,
  locations,
  onRefreshLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [geofenceRadius, setGeofenceRadius] = useState<number>(300); // 300 meters

  const latest = locations[0] || {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    timestamp: new Date().toISOString(),
    address: 'San Francisco, CA'
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map
      const map = L.map(mapContainerRef.current).setView([latest.latitude, latest.longitude], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Custom pulsing child marker
      const childIcon = L.divIcon({
        className: 'custom-child-pin',
        html: `<div style="
          width: 22px;
          height: 22px;
          background: #0284c7;
          border: 3px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(2, 132, 199, 0.8);
        "></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      markerRef.current = L.marker([latest.latitude, latest.longitude], { icon: childIcon }).addTo(map);

      // Safe Geofence Zone Circle
      circleRef.current = L.circle([latest.latitude, latest.longitude], {
        radius: geofenceRadius,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        weight: 2
      }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      const map = mapInstanceRef.current;
      map.setView([latest.latitude, latest.longitude]);
      markerRef.current?.setLatLng([latest.latitude, latest.longitude]);
      circleRef.current?.setLatLng([latest.latitude, latest.longitude]);
      circleRef.current?.setRadius(geofenceRadius);

      // Draw breadcrumb path
      if (locations.length > 1) {
        const latlngs: [number, number][] = locations.map((l) => [l.latitude, l.longitude]);
        if (polylineRef.current) {
          polylineRef.current.setLatLngs(latlngs);
        } else {
          polylineRef.current = L.polyline(latlngs, { color: '#38bdf8', weight: 3, dashArray: '5, 8' }).addTo(map);
        }
      }
    }
  }, [latest.latitude, latest.longitude, geofenceRadius, locations]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            Live Location &amp; Geofencing
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time GPS tracking with geofence safety boundary alerts.
          </p>
        </div>

        <button
          onClick={onRefreshLocation}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-emerald-400" />
          Ping GPS Now
        </button>
      </div>

      {/* Map & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Map View */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[520px]">
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-white">Live Tracking Active</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Accuracy: ±{Math.round(latest.accuracy)}m
            </span>
          </div>

          <div ref={mapContainerRef} className="flex-1 w-full h-full z-0" />
        </div>

        {/* Location Controls & History */}
        <div className="space-y-6">
          
          {/* Geofence Safety Zone Setting */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Safe Geofence Radius
              </h3>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {geofenceRadius} meters
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Receive immediate push notifications when child exits this green safety zone.
            </p>

            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={geofenceRadius}
              onChange={(e) => setGeofenceRadius(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Location Timeline Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 max-h-[340px] overflow-y-auto">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              Recent Location Log
            </h3>

            <div className="space-y-2.5 pt-2">
              {locations.slice(0, 8).map((loc, idx) => (
                <div
                  key={loc.id || idx}
                  className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-xs flex items-start gap-3"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-200 line-clamp-1">
                      {loc.address || `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {new Date(loc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
