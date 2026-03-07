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
