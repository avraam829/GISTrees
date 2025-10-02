"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Map, {
  Source,
  Layer,
  Popup,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Image from "next/image";
import type { Point as GeoPoint } from "geojson";
import type { Map as MapboxMap, GeoJSONSource, MapboxGeoJSONFeature } from "mapbox-gl";

type PhotoPoint = {
  id: number;
  sha256: string;
  lon: number;
  lat: number;
  image_url: string;
  shot_time?: string | null;
  device_id?: string | null;
  created_at?: string;
};

// properties для фич
type FeatureProps = {
  sha: string;
  image_url: string;
  device_id?: string | null;
  shot_time?: string | null;
  created_at?: string;
  point_count?: number;      // у кластеров
  cluster?: boolean;         // маркер кластера
  cluster_id?: number;       // id кластера для zoom-экспансии
};

export default function MapCanvas() {
  const [points, setPoints] = useState<PhotoPoint[]>([]);
  const [popup, setPopup] = useState<{ lon: number; lat: number; props: FeatureProps } | null>(null);

  const mapRef = useRef<MapRef | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

  useEffect(() => {
    fetch("/api/v1/photos")
      .then((r) => r.json())
      .then((list: PhotoPoint[]) => setPoints(list))
      .catch(() => setPoints([]));
  }, []);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: points.map((p) => ({
        type: "Feature" as const,
        properties: {
          sha: p.sha256,
          image_url: p.image_url,
          device_id: p.device_id ?? null,
          shot_time: p.shot_time ?? null,
          created_at: p.created_at ?? undefined,
        } satisfies FeatureProps,
        geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] as [number, number] },
      })),
    }),
    [points]
  );

  // форматирование времени
  const formatTime = (shot?: string | null, created?: string) => {
    const toLocal = (s?: string | null) => {
      if (!s) return null;
      const d = new Date(s);
      return isNaN(+d) ? null : d.toLocaleString();
    };
    return toLocal(shot) ?? toLocal(created) ?? "—";
  };

  const short = (s?: string | null, n = 12) =>
    s ? (s.length > n ? s.slice(0, n) + "…" : s) : "—";

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  // клик: если кластер — приблизить; если точка — открыть попап
  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0] as MapboxGeoJSONFeature | undefined;
    if (!feature) return;

    const props = feature.properties as FeatureProps | undefined;

    // клик по кластеру → expand zoom
    const isCluster =
      (props && typeof props.point_count === "number") ||
      (props && props.cluster === true);

    if (isCluster) {
      const map = mapRef.current?.getMap() as MapboxMap | undefined;
      const src = map?.getSource("photos") as GeoJSONSource | undefined;
      const clusterId = (props?.cluster_id as number | undefined) ?? undefined;
      const [lon, lat] = (feature.geometry as GeoPoint).coordinates as [number, number];

      if (src && typeof clusterId === "number") {
        src.getClusterExpansionZoom(clusterId, (err: unknown, zoom: number) => {
          if (!err && typeof zoom === "number") {
            map?.easeTo({ center: [lon, lat], zoom });
          } else {
            const cur = mapRef.current?.getZoom() ?? 10;
            mapRef.current?.easeTo({ center: [lon, lat], zoom: cur + 2 });
          }
        });
      } else {
        const cur = mapRef.current?.getZoom() ?? 10;
        mapRef.current?.easeTo({ center: [lon, lat], zoom: cur + 2 });
      }
      return;
    }

    // обычная точка → показываем попап
    if (!props || !props.image_url) return;
    const coords = (feature.geometry as GeoPoint).coordinates as [number, number];
    setPopup({ lon: coords[0], lat: coords[1], props });
  }, []);

  // курсор «рука» над интерактивными слоями
  const handleMove = useCallback((e: MapLayerMouseEvent) => {
    const layerId = e.features?.[0]?.layer?.id;
    const pointer = layerId === "clusters" || layerId === "cluster-count" || layerId === "unclustered-point";
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (map) {
      map.getCanvas().style.cursor = pointer ? "pointer" : "";
    }
  }, []);

  // удаление — подтверждение → запрос → обновить стейт и закрыть попап
  const handleDelete = async (sha: string) => {
    if (!confirm("Удалить фото? Оно будет удалено из БД и с диска.")) return;
    try {
      const r = await fetch(`/api/v1/photos/${sha}`, { method: "DELETE" });
      if (!r.ok) {
        const t = await r.text();
        alert(`Ошибка удаления: ${r.status} ${t}`);
        return;
      }
      setPoints(prev => prev.filter(p => p.sha256 !== sha));
      setPopup(null);
    } catch {
      alert("Сеть недоступна или сервер не отвечает");
    }
  };

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 37.62, latitude: 55.75, zoom: 10 }}
      style={{ width: "100%", height: "100%" }}
      mapboxAccessToken={token}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      onClick={handleClick}
      onMouseMove={handleMove}
      interactiveLayerIds={["clusters", "cluster-count", "unclustered-point"]}
    >
      <Source id="photos" type="geojson" data={geojson} cluster clusterMaxZoom={14} clusterRadius={50}>
        <Layer
          id="clusters"
          type="circle"
          filter={["has", "point_count"]}
          paint={{
            "circle-radius": 18,
            "circle-color": "#60a5fa",
            "circle-opacity": 0.85,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          }}
        />
        <Layer
          id="cluster-count"
          type="symbol"
          filter={["has", "point_count"]}
          layout={{
            "text-field": "{point_count_abbreviated}",
            "text-size": 12,
            "text-font": ["Open Sans Regular", "Arial Unicode MS Bold"],
          }}
          paint={{
            "text-color": "#111827"
          }}
        />
        <Layer
          id="unclustered-point"
          type="circle"
          filter={["!has", "point_count"]}
          paint={{
            "circle-radius": 6,
            "circle-color": "#3b82f6",
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#fff",
          }}
        />
      </Source>

      {popup && (
        <Popup
          longitude={popup.lon}
          latitude={popup.lat}
          onClose={() => setPopup(null)}
          closeOnMove
          maxWidth="360px"
        >
          <div
            style={{
              display: "grid",
              gap: 10,
              maxWidth: 340,
              background: "#fff",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              boxShadow: "0 12px 28px rgba(0,0,0,.15)",
              overflow: "hidden",
            }}
          >
            <a href={popup.props.image_url} target="_blank" rel="noreferrer" title="Открыть оригинал">
              <Image
                src={popup.props.image_url}
                alt=""
                width={340}
                height={220}
                unoptimized
                style={{ display: "block", width: "100%", height: "auto", maxHeight: 240, objectFit: "cover" }}
              />
            </a>

            <div style={{ padding: 10, fontSize: 12, lineHeight: 1.35, color: "#111827" }}>
              <div><b>Кто:</b> {popup.props.device_id || "—"}</div>
              <div><b>Время:</b> {formatTime(popup.props.shot_time, popup.props.created_at)}</div>
              <div>
                <b>Координаты:</b> {popup.lat.toFixed(6)}, {popup.lon.toFixed(6)}{" "}
                <button
                  onClick={() => copy(`${popup.lat},${popup.lon}`)}
                  title="Скопировать"
                  style={btnMini}
                >
                  копир.
                </button>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${popup.lat}&mlon=${popup.lon}#map=17/${popup.lat}/${popup.lon}`}
                  target="_blank" rel="noreferrer"
                  style={{ marginLeft: 6, textDecoration: "underline" }}
                >
                  OSM
                </a>
              </div>
              <div>
                <b>SHA:</b> {short(popup.props.sha, 16)}{" "}
                <button onClick={() => copy(popup.props.sha)} title="Скопировать SHA" style={btnMini}>копир.</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, padding: "0 10px 10px 10px", flexWrap: "wrap" }}>
              <a href={popup.props.image_url} target="_blank" rel="noreferrer" style={btnPrimary}>Открыть</a>
              <a href={popup.props.image_url} download style={btnGhost}>Скачать</a>
              <button
                onClick={() => handleDelete(popup.props.sha)}
                style={btnDanger}
              >
                Удалить
              </button>
            </div>
          </div>
        </Popup>
      )}
    </Map>
  );
}

/* мини-стили для кнопок в попапе */
const btnMini: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 6px",
  border: "1px solid #ddd",
  borderRadius: 4,
  background: "#f8f8f8",
  cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  background: "#2563eb",
  color: "#fff",
  textDecoration: "none",
  fontSize: 12,
};
const btnGhost: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ddd",
  textDecoration: "none",
  fontSize: 12,
  background: "#fff",
};
const btnDanger: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  background: "#dc2626",
  color: "#fff",
  border: "1px solid #b91c1c",
  fontSize: 12,
  cursor: "pointer",
};
