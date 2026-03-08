// Shared error type
export interface ApiError {
  detail: string;
}

// Page (printable_pages)
export interface Page {
  id: number;
  url: string;
  thumbnail: string;
  type: 'print' | 'collection';
  source: string;
  parent_id: number | null;
  searches: Array<{ link: string; text: string }>;
}

export interface PageCreate {
  url: string;
  thumbnail: string;
  type?: 'print' | 'collection';
  source?: string;
  tags?: string[];
  parent_id?: number | null;
}

export interface PageUpdate {
  url?: string;
  thumbnail?: string;
  type?: 'print' | 'collection';
  source?: string;
  tags?: string[];
  parent_id?: number | null;
}

// Tag
export interface Tag {
  id: number;
  name: string;
  id_translation: string;
  blocked: boolean;
}

export interface TagCreate {
  name: string;
  id_translation?: string;
}

export interface TagUpdate {
  name?: string;
  id_translation?: string;
}

// Device
export interface Device {
  device_id: string;
  device_name: string;
  registered_at: string;
  is_active: boolean;
  is_admin: boolean;
}

// Insights
export interface DeviceSummary {
  device_id: string;
  device_name: string;
  total_views: number;
  total_details: number;
  total_prints: number;
}

export interface TopTagEntry {
  tag_name: string;
  id_translation: string;
  count: number;
}

export interface TopTagsResult {
  [device_id: string]: TopTagEntry[];
}

export interface TopImage {
  image_id: number;
  thumbnail: string;
  url: string;
  print_count: number;
  tags: string[];
}

export interface TopImagesResult {
  overall: TopImage[];
}

export interface TimelineEvent {
  event_type: 'view' | 'detail' | 'print';
  image_id: string;
  thumbnail: string | null;
  event_timestamp: string;
}

export interface TimelineDay {
  date: string;
  events: TimelineEvent[];
}

export interface InterestEntry {
  tag_name: string;
  devices: string[];
}

export interface InterestsResult {
  shared: InterestEntry[];
  unique: { [device_id: string]: InterestEntry[] };
}

export interface TranslationResult {
  translated: number;
  skipped: number;
}

export interface MergeResult {
  merged_events: number;
  source_id: string;
  target_id: string;
}

export interface PrintResult {
  status: string;
  message: string;
}
