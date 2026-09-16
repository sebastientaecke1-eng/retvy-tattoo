"use client";

import { useEffect, useRef } from "react";
import type { ProProfileRow } from "@/lib/database.types";

// France bounding box
const FRANCE_BOUNDS: [[number, number], [number, number]] = [
  [41.0, -5.5],  // SW (near Pyrenees / Corsica south)
  [51.5, 10.0],  // NE (near Belgian/German border)
];
const FRANCE_CENTER: [number, number] = [46.6, 2.3];
const FRANCE_ZOOM = 5;
const FRANCE_MIN_ZOOM = 5;

interface Props {
  artists: ProProfileRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  centerLat?: number;
  centerLng?: number;
}

export function CatalogueMap({ artists, selectedId, onSelect, centerLat, centerLng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null);
  const markersRef = useRef<Record<string, ReturnType<typeof import("leaflet")["marker"]>>>({});
  const prevCenterRef = useRef<{ lat?: number; lng?: number }>({});
  const initialFitDoneRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: FRANCE_CENTER,
        zoom: FRANCE_ZOOM,
        minZoom: FRANCE_MIN_ZOOM,
        maxBounds: FRANCE_BOUNDS,
        maxBoundsViscosity: 0.85,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Cleanup old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const geoArtists = artists.filter((a) => a.latitude != null && a.longitude != null);

    geoArtists.forEach((artist) => {
      const isSelected = artist.id === selectedId;

      const size = isSelected ? 44 : 36;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background: ${isSelected ? "#1e40af" : "#4f8ef7"};
          width: ${size}px; height: ${size}px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0,0,0,${isSelected ? "0.5" : "0.3"});
        "></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
        popupAnchor: [0, -(size/2 + 6)],
      });

      const marker = L.marker([artist.latitude!, artist.longitude!], { icon });

      const styles = (artist.styles ?? []).slice(0, 2).join(", ");
      const priceStr =
        artist.price_min && artist.price_max
          ? `${artist.price_min}–${artist.price_max} €/h`
          : artist.price_min
            ? `À partir de ${artist.price_min} €/h`
            : "";

      marker.bindPopup(
        `<div style="min-width:180px;font-family:system-ui,sans-serif">
          ${artist.avatar_url
            ? `<img src="${artist.avatar_url}" alt="${artist.artist_name}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:8px">`
            : ""}
          <div style="font-weight:700;font-size:14px;color:#18181b;margin-bottom:2px">${artist.artist_name}</div>
          <div style="font-size:12px;color:#71717a;margin-bottom:4px">${artist.city ?? ""}</div>
          ${styles ? `<div style="font-size:11px;color:#4f8ef7;margin-bottom:4px">${styles}</div>` : ""}
          ${priceStr ? `<div style="font-size:11px;color:#71717a;margin-bottom:8px">${priceStr}</div>` : ""}
          <a href="/ink/${artist.slug}" style="display:block;background:#4f8ef7;color:white;text-align:center;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">
            Voir le profil →
          </a>
        </div>`,
        { maxWidth: 220 }
      );

      marker.on("click", () => onSelect(artist.id));
      marker.addTo(map);
      markersRef.current[artist.id] = marker;
    });

    // Only flyTo when the center actually changes
    const centerChanged =
      centerLat !== prevCenterRef.current.lat || centerLng !== prevCenterRef.current.lng;

    if (centerLat != null && centerLng != null && centerChanged) {
      map.flyTo([centerLat, centerLng], 11, { duration: 1.2 });
      prevCenterRef.current = { lat: centerLat, lng: centerLng };
    } else if (centerLat == null && centerLng == null) {
      prevCenterRef.current = {};
      // fitBounds to all artists only on first load
      if (!initialFitDoneRef.current && geoArtists.length > 0) {
        const bounds = L.latLngBounds(
          geoArtists.map((a) => [a.latitude!, a.longitude!] as [number, number])
        );
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
          initialFitDoneRef.current = true;
        }
      }
    }

    // Open popup for selected marker
    if (selectedId && markersRef.current[selectedId]) {
      markersRef.current[selectedId].openPopup();
    }
  }, [artists, selectedId, onSelect, centerLat, centerLng]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    />
  );
}
