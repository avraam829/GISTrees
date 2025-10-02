"use client";

import {useMemo, useRef, useState, useCallback} from "react";
import Map, { Popup, type MapLayerMouseEvent, type MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type {Feature, FeatureCollection, Point} from "geojson";
import type { Map as MapboxMap, GeoJSONSource, MapboxGeoJSONFeature } from "mapbox-gl";
import ClusterLayers from "./ClusterLayers";
import PhotoPopup, { type PopupData } from "./PhotoPopup";
import { usePhotos } from "./usePhotos";
import type { FeatureProps, PhotoPoint } from "./types";

export default function MapCanvas() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
  const { rows, removeBySha } = usePhotos();
  const mapRef = useRef<MapRef | null>(null);

  const [popup, setPopup] = useState<PopupData | null>(null);

  // готовим коллекцию фич
  const fc: FeatureCollection<Point, FeatureProps> = useMemo(() => ({
    type: "FeatureCollection",
    features: rows.map((p: PhotoPoint): Feature<Point, FeatureProps> => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: {
        sha: p.sha256,
        image_url: p.image_url,
        device_id: p.device_id ?? null,
        shot_time: p.shot_time ?? null,
        created_at: p.created_at ?? undefined,
      },
    })),
  }), [rows]);

  const handleClick = useCallback((e: MapLayerMouseEvent) => {
    const f = e.features?.[0] as MapboxGeoJSONFeature | undefined;
    if (!f) return;

    const props = f.properties as FeatureProps | undefined;
    const isCluster =
      (props && typeof props.point_count === "number") ||
      (props && props.cluster === true);

    if (isCluster) {
      const map = mapRef.current?.getMap() as MapboxMap | undefined;
      const source = map?.getSource("photos") as GeoJSONSource | undefined;
      const clusterId = (props?.cluster_id as number | undefined) ?? undefined;
      const [lon, lat] = (f.geometry as Point).coordinates as [number, number];

      if (source && typeof clusterId === "number") {
        source.getClusterExpansionZoom(clusterId, (err: unknown, zoom: number) => {
          if (!err && typeof zoom === "number") map?.easeTo({ center: [lon, lat], zoom });
        });
      } else {
        const curZ = mapRef.current?.getZoom() ?? 10;
        mapRef.current?.easeTo({ center: [lon, lat], zoom: curZ + 2 });
      }
      return;
    }

    if (!props || !props.image_url) return;
    const [lon, lat] = (f.geometry as Point).coordinates as [number, number];
    setPopup({
      sha: props.sha,
      url: props.image_url,
      lat,
      lon,
      device_id: props.device_id,
      shot_time: props.shot_time,
      created_at: props.created_at,
    });
  }, []);

  const handleMove = useCallback((e: MapLayerMouseEvent) => {
    const lid = e.features?.[0]?.layer?.id;
    const pointer = lid === "clusters" || lid === "cluster-count" || lid === "unclustered-point";
    const map = mapRef.current?.getMap() as MapboxMap | undefined;
    if (map) map.getCanvas().style.cursor = pointer ? "pointer" : "";
  }, []);

  const handleDelete = async (sha: string) => {
    if (!confirm("Удалить фото? Оно будет удалено из БД и с диска.")) return;
    try {
      const r = await fetch(`/api/v1/photos/${sha}`, { method: "DELETE" });
      if (!r.ok) {
        const t = await r.text();
        alert(`Ошибка удаления: ${r.status} ${t}`);
        return;
      }
      removeBySha(sha);
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
      <ClusterLayers data={fc} />

      {popup && (
        <Popup longitude={popup.lon} latitude={popup.lat} onClose={() => setPopup(null)} closeOnMove maxWidth="360px">
          <PhotoPopup
            data={popup}
            onDelete={handleDelete}
            onClose={() => setPopup(null)}
          />
        </Popup>
      )}
    </Map>
  );
}
