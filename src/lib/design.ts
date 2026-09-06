import settings from '../content/system/design.json';
import type { Locale } from '../i18n/config';
export const designIds = ['signature', 'balance', 'editorial', 'atlas', 'panorama'] as const;
export type DesignId = typeof designIds[number];
if (!designIds.includes(settings.defaultDesign as DesignId)) throw new Error('Unknown default layout');
export const designSettings = settings as { defaultDesign: DesignId; showSwitcher: boolean };
export const designLabels: Record<Locale, { label: string; names: string[]; descriptions: string[] }> = {
 ru: { label: 'Раскладка', names: ['Signature', 'Balance', 'Editorial', 'Atlas', 'Panorama'], descriptions: ['Центрированная · прежний вариант 04', 'Две колонки · текст слева, карта справа', 'Редакционная · заголовок и нумерованные строки', 'Карта слева · модульные блоки', 'Панорамная · широкий заголовок и горизонтальные секции'] },
 it: { label: 'Layout', names: ['Signature', 'Balance', 'Editorial', 'Atlas', 'Panorama'], descriptions: ['Centrato · il precedente design 04', 'Due colonne · testo a sinistra, mappa a destra', 'Editoriale · titolo ampio e righe numerate', 'Mappa a sinistra · struttura modulare', 'Panoramico · titolo a tutta larghezza e sezioni orizzontali'] },
 en: { label: 'Layout', names: ['Signature', 'Balance', 'Editorial', 'Atlas', 'Panorama'], descriptions: ['Centred · the previous design 04', 'Two columns · text left, map right', 'Editorial · broad headline and numbered rows', 'Map left · modular sections', 'Panoramic · full-width headline and horizontal sections'] },
};
