export interface SearchTag {
  link: string;
  text: string;
}

interface BaseItem {
  id?: number;
  thumbnail: string;
  url: string;
  searches: SearchTag[];
  type: 'print' | 'collection';
}

export interface PrintItem extends BaseItem {
  type: 'print';
}

export interface CollectionItem extends BaseItem {
  type: 'collection';
  prints: PrintItem[];
}

export type Item = PrintItem | CollectionItem;

export function isCollection(item: Item): item is CollectionItem {
  return item.type === 'collection';
}

export interface ServerConfig {
  ip: string;
  port: number;
}

export interface PrintResponse {
  status: 'sent_to_printer';
  message: string;
}

export interface ApiError {
  detail: string;
}

export interface Suggestion {
  name: string;
  id_translation: string | null;
}

export interface ImageItem {
  id: number;
  url: string;
  thumbnail?: string;
  print_count: number;
}

export interface Category {
  id: number;
  name: string;
  emoji: string;
  tag_count: number;
  print_count: number;
  example_images: ImageItem[];
}

export interface CategorySubcategory {
  id: number;
  name: string;
  emoji: string;
  example_images: ImageItem[];
}

export interface CategoryItem {
  id: number;
  url: string;
  thumbnail?: string;
  print_count: number;
  tags: string[];
}
