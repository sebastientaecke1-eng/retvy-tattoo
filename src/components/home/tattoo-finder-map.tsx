"use client";

import { useEffect, useRef } from "react";
import { geocodeCity } from "@/lib/geocode";
import type { TattooFinderArtist } from "@/lib/home/tattoo-finder";
import "leaflet/dist/leaflet.css";

const COBALT = "#3060ff";
const FRANCE_CENTER: [number, number] = [46.6, 2.4];
const FRANCE_ZOOM = 6;
const CITY_ZOOM = 11;
const PRO_ZOOM = 11;

// Dark map tile (CartoDB Dark Matter)
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

// CSS injected once to override Leaflet popup defaults
const POPUP_CSS = `
.retvy-popup .leaflet-popup-content-wrapper {
  background: #0f1420;
  border: 1px solid #1e2240;
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(48,96,255,0.1);
  padding: 0;
  color: #e2e4f0;
  font-family: 'DM Sans', system-ui, sans-serif;
}
.retvy-popup .leaflet-popup-content {
  margin: 0;
  width: 240px !important;
}
.retvy-popup .leaflet-popup-tip {
  background: #1e2240;
}
.retvy-popup .leaflet-popup-close-button {
  color: #5a618a !important;
  top: 10px !important;
  right: 10px !important;
  font-size: 18px !important;
  width: 22px !important;
  height: 22px !important;
  border-radius: 50%;
  background: rgba(255,255,255,0.06) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.retvy-popup .leaflet-popup-close-button:hover {
  background: rgba(255,255,255,0.12) !important;
  color: #e2e4f0 !important;
}
.leaflet-container {
  background: #0d1117;
}
`;

function injectPopupStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("retvy-leaflet-popup-css")) return;
  const style = document.createElement("style");
  style.id = "retvy-leaflet-popup-css";
  style.textContent = POPUP_CSS;
  document.head.appendChild(style);
}

function buildPopupHTML(artist: TattooFinderArtist): string {
  const initials = artist.artist_name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const tagsHTML = artist.families
    .slice(0, 3)
    .map(
      (f) =>
        `<span style="font-size:0.68rem;font-weight:500;color:#8890b8;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.07);padding:2px 7px;border-radius:100px;white-space:nowrap">${escapeHtml(f.label)}</span>`,
    )
    .join("");

  const cityHTML = artist.city
    ? `<div style="display:flex;align-items:center;gap:4px;font-size:0.75rem;color:#5a618a;margin-top:3px">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#5a618a" stroke-width="1.5" stroke-linecap="round">
          <path d="M5 9S1.5 6 1.5 4a3.5 3.5 0 017 0C8.5 6 5 9 5 9z"/>
          <circle cx="5" cy="4" r="1" fill="#5a618a" stroke="none"/>
        </svg>
        ${escapeHtml(artist.city)}
      </div>`
    : "";

  return `
<div style="padding:14px;font-family:system-ui,sans-serif">
  <div style="display:flex;gap:11px;align-items:flex-start">
    <div style="width:44px;height:44px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700;background:linear-gradient(135deg,#1a2040,#2a3a70);color:#7090ff">
      ${escapeHtml(initials)}
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-size:0.9rem;font-weight:600;color:#e2e4f0;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${escapeHtml(artist.artist_name)}
      </div>
      ${cityHTML}
    </div>
  </div>
  ${
    tagsHTML
      ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:9px">${tagsHTML}</div>`
      : ""
  }
  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06)">
    <a href="/ink/${escapeHtml(artist.slug)}" style="font-size:0.8rem;font-weight:600;color:#3060ff;text-decoration:none;display:flex;align-items:center;gap:4px">
      Voir le profil
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#3060ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2.5 6.5h8M7 3l3.5 3.5L7 10"/>
      </svg>
    </a>
  </div>
</div>`;
}

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

      injectPopupStyles();

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const withCoords = artists.filter(
        (a) => a.latitude != null && a.longitude != null,
      );

      const map = L.map(containerRef.current, {
        scrollWheelZoom: true,
        attributionControl: true,
        zoomControl: true,
      });

      mapRef.current = map;

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTR,
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      for (const artist of withCoords) {
        const lat = artist.latitude!;
        const lng = artist.longitude!;

        const marker = L.circleMarker([lat, lng], {
          radius: 9,
          fillColor: COBALT,
          color: "#ffffff",
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.95,
        }).addTo(map);

        marker.bindPopup(buildPopupHTML(artist), {
          className: "retvy-popup",
          maxWidth: 260,
          minWidth: 240,
          offset: [0, -4],
          closeButton: true,
          autoClose: true,
          closeOnClick: false,
        });

        marker.on("click", () => marker.openPopup());
      }

      // Fit bounds or center on city
      if (withCoords.length > 0) {
        if (withCoords.length === 1) {
          map.setView([withCoords[0].latitude!, withCoords[0].longitude!], PRO_ZOOM);
        } else {
          const bounds = L.latLngBounds(
            withCoords.map((a) => [a.latitude!, a.longitude!] as [number, number]),
          );
          map.fitBounds(bounds, { padding: [80, 80], maxZoom: PRO_ZOOM });
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
      style={{ background: "#0d1117" }}
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
