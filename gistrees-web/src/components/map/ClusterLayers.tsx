"use client";

import { Layer, Source } from "react-map-gl";
import type { FeatureCollection, Point } from "geojson";
import type { FeatureProps } from "./types";

export default function ClusterLayers({ data }: { data: FeatureCollection<Point, FeatureProps> }) {
  return (
    <Source id="photos" type="geojson" data={data} cluster clusterMaxZoom={14} clusterRadius={50}>
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
        paint={{ "text-color": "#111827" }}
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
  );
}
