export type PhotoPoint = {
  id: number;
  sha256: string;
  lon: number;
  lat: number;
  image_url: string;
  shot_time?: string | null;
  device_id?: string | null;
  created_at?: string;
};

export type FeatureProps = {
  sha: string;
  image_url: string;
  device_id?: string | null;
  shot_time?: string | null;
  created_at?: string;
  point_count?: number;  // для кластеров
  cluster?: boolean;
  cluster_id?: number;
};
