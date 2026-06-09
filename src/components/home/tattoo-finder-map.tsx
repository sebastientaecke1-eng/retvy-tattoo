"use client";

import { useEffect, useRef } from "react";
import { geocodeCity } from "@/lib/geocode";
import type { TattooFinderArtist } from "@/lib/home/tattoo-finder";
import "leaflet/dist/leaflet.css";

const COBALT = "#0057FF";
const FRANCE_CENTER: [number, number] = [46.6, 2.4];
const FRANCE_ZOOM = 6;
const CITY_ZOOM = 11;
const PRO_ZOOM = 11;

type Props = {
  artists: TattooFinderArtist[];
  city?: string;
  className?: string;
};

export function TattooFinderMap({ artists, city, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    async function initMap() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const withCoords = artists.filter(
        (a) => a.latitude != null && a.longitude != null,
      );

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });

      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      for (const artist of withCoords) {
        const lat = artist.latitude!;
        const lng = artist.longitude!;
        const marker = L.circleMarker([lat, lng], {
          radius: 9,
          fillColor: COBALT,
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.95,
        }).addTo(map);

        marker.bindPopup(
          `<div style="font-family:system-ui,sans-serif;min-width:140px">
            <strong style="color:#0A0A0A">${escapeHtml(artist.artist_name)}</strong>
            <br/>
            <a href="/ink/${escapeHtml(artist.slug)}" style="color:${COBALT};font-size:13px">Voir le profil</a>
          </div>`,
        );
      }

      if (withCoords.length > 0) {
        if (withCoords.length === 1) {
          map.setView(
            [withCoords[0].latitude!, withCoords[0].longitude!],
            PRO_ZOOM,
          );
        } else {
          const bounds = L.latLngBounds(
            withCoords.map((a) => [a.latitude!, a.longitude!] as [number, number]),
          );
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: PRO_ZOOM });
        }
        return;
      }

      const searchedCity = city?.trim();
      if (searchedCity) {
        const coords = await geocodeCity(searchedCity);
        if (cancelled) return;

        if (coords) {
          map.setView([coords.lat, coords.lon], CITY_ZOOM);
          return;
        }
      }

      map.setView(FRANCE_CENTER, FRANCE_ZOOM);
    }

    void initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [artists, city]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ background: "#0A0A0A" }}
      aria-label="Carte des tatoueurs"
    />
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
