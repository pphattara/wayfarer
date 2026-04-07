// types/social.ts

export interface Post {
  id: string;
  user_id: string;
  trip_id: string | null;
  caption: string;
  media_urls: string[];
  lat: number | null;
  lng: number | null;
  destination_name: string | null;
  visibility: 'public' | 'followers' | 'private';
  likes_count: number;
  comments_count: number;
  created_at: string;
  // joined via select
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
  user_has_liked?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface CreatorRoute {
  id: string;
  user_id: string;
  trip_id: string | null;
  title: string;
  summary: string;
  geojson: GeoJSONFeature;
  days: number;
  tags: string[];
  published: boolean;
  view_count: number;
  save_count: number;
  created_at: string;
  author?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: Record<string, unknown>;
}

export interface CommunityPin {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  name: string;
  category: string;
  note: string | null;
  photo_url: string | null;
  verified: boolean;
  created_at: string;
}

export interface Follower {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export type CreatePostInput = {
  trip_id?: string;
  caption: string;
  mediaUris: string[];          // local file URIs before upload
  lat?: number;
  lng?: number;
  destination_name?: string;
  visibility: Post['visibility'];
};

export type CreatePinInput = {
  lat: number;
  lng: number;
  name: string;
  category: string;
  note?: string;
  photoUri?: string;
};
