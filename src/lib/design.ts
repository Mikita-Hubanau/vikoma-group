import settings from '../content/system/design.json';
import type { Locale } from '../i18n/config';
export const designIds = ['original', 'editorial', 'atlas', 'signature', 'grid'] as const;
export type DesignId = typeof designIds[number];
if (!designIds.includes(settings.defaultDesign as DesignId)) throw new Error('Unknown default design');
export const designSettings = settings as { defaultDesign: DesignId; showSwitcher: boolean };
export const designLabels: Record<Locale, { label: string; names: string[]; descriptions: string[] }> = {
 ru: { label: 'Дизайн', names: ['Оригинал', 'Editorial', 'Atlas', 'Signature', 'Grid'], descriptions: ['Исходный дизайн', 'Терракота · редакционная композиция', 'Олива · деловая сетка', 'Золото · сдержанный премиум', 'Графит · строгая типографика'] },
 it: { label: 'Design', names: ['Originale', 'Editorial', 'Atlas', 'Signature', 'Grid'], descriptions: ['Design originale', 'Terracotta · stile editoriale', 'Oliva · struttura aziendale', 'Oro · eleganza essenziale', 'Grafite · rigore tipografico'] },
 en: { label: 'Design', names: ['Original', 'Editorial', 'Atlas', 'Signature', 'Grid'], descriptions: ['Original design', 'Terracotta · editorial layout', 'Olive · business grid', 'Gold · understated premium', 'Graphite · precise typography'] },
};
