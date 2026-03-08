# Data Model: React Admin Dashboard

No new data entities. The admin dashboard consumes existing backend API responses. This document maps the API response shapes to TypeScript types used in the frontend.

## API Response Types

### Page (printable_pages)

```typescript
interface Page {
  id: number;
  url: string;
  thumbnail: string;
  type: 'print' | 'collection';
  source: string;
  parent_id: number | null;
  searches: Array<{ link: string; text: string }>; // tags
}
```

### Tag

```typescript
interface Tag {
  id: number;
  name: string;
  id_translation: string;
  blocked: boolean;
}
```

### Device

```typescript
interface Device {
  id: string;
  device_name: string;
  registered_at: string;
  is_active: boolean;
  is_admin: boolean;
  android_id: string | null;
}
```

### Insights

```typescript
interface DeviceSummary {
  device_id: string;
  device_name: string;
  views: number;
  details: number;
  prints: number;
}

interface TopTag {
  tag_name: string;
  id_translation: string;
  count: number;
}

interface TopImage {
  page_id: number;
  thumbnail: string;
  url: string;
  print_count: number;
  tags: string[];
}

interface TimelineEvent {
  event_type: 'view' | 'detail' | 'print';
  image_id: string;
  thumbnail: string | null;
  event_timestamp: string;
}

interface TimelineDay {
  date: string;
  events: TimelineEvent[];
}
```

## Relationships

- Page has many Tags (via page_tags join table, exposed as `searches` array)
- Device has many ActivityEvents (not directly queried from admin — aggregated via insights endpoints)
- Tag can be blocked (hides pages with only that tag from children)
