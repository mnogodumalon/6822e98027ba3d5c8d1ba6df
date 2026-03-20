import type { Bilder } from './app';

export type EnrichedBilder = Bilder & {
  bild_standortName: string;
};
