// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Bilder {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    bild_datei?: string;
    bild_titel?: string;
    bild_beschreibung?: string;
    bild_aufnahmedatum?: string; // Format: YYYY-MM-DD oder ISO String
    bild_standort?: string; // applookup -> URL zu 'Standorte' Record
  };
}

export interface Standorte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    standort_name?: string;
    standort_beschreibung?: string;
    standort_position?: GeoLocation; // { lat, long, info }
  };
}

export const APP_IDS = {
  BILDER: '6822e973c07d98c861cb2db6',
  STANDORTE: '6822e9709bf15c1e2a8dca33',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'bilder': {
    'bild_datei': 'file',
    'bild_titel': 'string/text',
    'bild_beschreibung': 'string/textarea',
    'bild_aufnahmedatum': 'date/datetimeminute',
    'bild_standort': 'applookup/select',
  },
  'standorte': {
    'standort_name': 'string/text',
    'standort_beschreibung': 'string/textarea',
    'standort_position': 'geo',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateBilder = StripLookup<Bilder['fields']>;
export type CreateStandorte = StripLookup<Standorte['fields']>;