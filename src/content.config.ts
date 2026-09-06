import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Content remains editable through /admin/. Unknown fields are rejected so
// CMS / schema mismatches cannot silently discard a user's changes.
const BASE = './src/content';
const idFromFileName = ({ entry }: { entry: string }) => entry.split('/').pop()!.replace(/\.[^.]+$/, '');
const idFromFolder = ({ entry }: { entry: string }) => entry.split('/').slice(-2, -1)[0];
const idLocaleAndSlug = ({ entry }: { entry: string }) => entry.replace(/\.[^.]+$/, '').split('/').slice(-2).join('/');
const seo = z.object({ title: z.string().min(1), description: z.string().min(1), ogImage: z.string().optional() }).strict();
const cta = z.object({ label: z.string(), page: z.enum(['home', 'about', 'services', 'events', 'contacts']) }).strict();
const icon = z.enum(['chart', 'store', 'scales', 'card', 'network', 'building']);
const textItems = z.object({ title: z.string(), items: z.array(z.object({ title: z.string(), text: z.string() }).strict()) }).strict();
const process = z.object({ eyebrow: z.string(), title: z.string(), steps: z.array(z.object({ title: z.string(), text: z.string() }).strict()).length(4) }).strict();
const sectionTitle = z.object({ title: z.string(), eyebrow: z.string() }).strict();
const blankEmail = z.union([z.literal(''), z.string().email()]).default('');
const httpsLink = z.union([z.literal(''), z.string().url().refine((s) => s.startsWith('https://'), 'Нужна ссылка https://')]).default('');
const partner = z.object({ id: z.enum(['naip','retail']), shortName: z.string(), name: z.string(), icon, description: z.string(), logo: z.string().default(''), href: httpsLink.default('') }).strict();

const settings = defineCollection({
  loader: glob({ pattern: 'settings/*.json', base: BASE, generateId: idFromFileName }),
  schema: z.object({
    company: z.object({ name: z.string(), tagline: z.string() }).strict(),
    email: blankEmail,
    phones: z.array(z.object({ label: z.string(), display: z.string(), tel: z.string().regex(/^\+[0-9]{7,15}$/) }).strict()).default([]),
    // Retained for compatibility with old content. Public contact links now use socials.
    messengers: z.array(z.object({ type: z.enum(['telegram','whatsapp','viber']), label: z.string(), href: z.string() }).strict()).default([]),
    offices: z.array(z.object({ id: z.enum(['italy','belarus']), title: z.string(), city: z.string(), person: z.string(), address: z.string().default(''), note: z.string(), phone: z.string().default(''), tel: z.union([z.literal(''),z.string().regex(/^\+[0-9]{7,15}$/)]).default(''), email: blankEmail }).strict()).length(2),
    legal: z.array(z.object({ label: z.string(), value: z.string() }).strict()).default([]),
    socials: z.array(z.object({ type: z.enum(['linkedin','telegram']), label: z.string(), href: httpsLink }).strict()).length(2),
    partners: z.array(partner).length(2),
  }).strict(),
});
const homePage = defineCollection({
  loader: glob({ pattern: 'pages/*/home.json', base: BASE, generateId: idFromFolder }),
  schema: z.object({
    seo,
    hero: z.object({ eyebrow: z.string(), titleLines: z.array(z.string()), lead: z.string(), cta, secondaryCta: cta, map: z.object({ countries: z.array(z.object({ id: z.enum(['italy','belarus','russia']), label: z.string() }).strict()) }).strict() }).strict(),
    whatWeDo: z.object({ eyebrow: z.string(), title: z.string(), cards: z.array(z.object({ icon, title: z.string(), text: z.string(), anchor: z.string().regex(/^[a-z-]+$/) }).strict()).length(4) }).strict(),
    about: z.object({ eyebrow: z.string(), title: z.string(), paragraphs: z.array(z.string()), cta }).strict(),
    seminar: z.object({ eyebrow: z.string(), title: z.string(), archiveTitle: z.string(), text: z.string(), cta, archiveCta: z.string() }).strict(),
    stats: z.object({ eyebrow: z.string(), items: z.array(z.object({ value: z.string(), suffix: z.string().default(''), label: z.string(), kind: z.enum(['number','text']) }).strict()).length(4) }).strict(),
    partners: sectionTitle,
    contact: z.object({ title: z.string(), text: z.string(), label: z.string() }).strict(),
  }).strict(),
});
const aboutPage = defineCollection({
  loader: glob({ pattern: 'pages/*/about.json', base: BASE, generateId: idFromFolder }),
  schema: z.object({ seo, title: z.string(), lead: z.string(),
    mission: z.object({ title: z.string(), text: z.string() }).strict(),
    team: z.object({ title: z.string(), people: z.array(z.object({ name: z.string(), initials: z.string(), role: z.string(), about: z.string(), photo: z.string().default('') }).strict()).length(2) }).strict(),
    experts: z.object({ title: z.string(), text: z.string(), people: z.array(z.string()) }).strict(),
    status: z.object({ title: z.string(), text: z.string(), listTitle: z.string(), items: z.array(z.string()), retail: z.string() }).strict(),
    approach: textItems, partners: sectionTitle,
  }).strict(),
});
const servicesPage = defineCollection({
  loader: glob({ pattern: 'pages/*/services.json', base: BASE, generateId: idFromFolder }),
  schema: z.object({ seo, title: z.string(), lead: z.string(), howWeWork: process }).strict(),
});
const services = defineCollection({
  loader: glob({ pattern: 'services/*/*.md', base: BASE, generateId: idLocaleAndSlug }),
  schema: z.object({ title: z.string(), order: z.number().int().min(1).max(5), anchor: z.string().regex(/^[a-z-]+$/), icon, partner: z.string().default(''), items: z.array(z.string()).min(1) }).strict(),
});
const eventsPage = defineCollection({
  loader: glob({ pattern: 'pages/*/events.json', base: BASE, generateId: idFromFolder }),
  schema: z.object({ seo, title: z.string(), lead: z.string(), eyebrow: z.string(),
    detailsTitle: z.string(), dateLabel: z.string(), timeLabel: z.string(), timeNote: z.string(),
    formatLabel: z.string(), formatValue: z.string(), languageLabel: z.string(), languageValue: z.string(), languageNote: z.string(), costLabel: z.string(), costValue: z.string(),
    programTitle: z.string(), programNote: z.string(), program: z.array(z.string()).min(1), durationLabel: z.string(), durationValue: z.string(),
    registration: z.object({ title: z.string(), text: z.string(), button: z.string(), externalNote: z.string(), externalButton: z.string(), unavailable: z.string(), closed: z.string(), ended: z.string(), firstName: z.string(), lastName: z.string(), company: z.string(), email: z.string(), phone: z.string(), requiredNote: z.string(), consent: z.string(), privacyLink: z.string(), sending: z.string(), success: z.string(), error: z.string(), uncertain: z.string(), rateLimited: z.string(), validationError: z.string() }).strict(),
  }).strict(),
});
const contactsPage = defineCollection({
  loader: glob({ pattern: 'pages/*/contacts.json', base: BASE, generateId: idFromFolder }),
  schema: z.object({ seo, title: z.string(), lead: z.string(),
    form: z.object({ title: z.string(), lead: z.string(), name: z.string(), email: z.string(), phone: z.string(), message: z.string(), requiredNote: z.string(), consent: z.string(), privacyLink: z.string(), submit: z.string(), sending: z.string(), success: z.string(), error: z.string(), uncertain: z.string(), rateLimited: z.string(), validationError: z.string(), unavailable: z.string() }).strict(),
    privacy: z.object({ title: z.string(), text: z.string(), policyLabel: z.string(), policyUrl: httpsLink }).strict(),
  }).strict(),
});
// Legacy industry data is retained as a reusable archive, not a menu section.
const industriesPage = defineCollection({
  loader: glob({ pattern: 'pages/*/industries.json', base: BASE, generateId: idFromFolder }),
  schema: z.object({ seo, title: z.string(), lead: z.string() }),
});
// ── Отрасли: по файлу на отрасль ──────────────────────────────
const industries = defineCollection({
  loader: glob({ pattern: 'industries/*/*.md', base: BASE, generateId: idLocaleAndSlug }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    /** Короткая подпись под заголовком: «станки, линии, комплектующие» */
    summary: z.string(),
    /** Картинка. Пока пусто — рисуется заглушка с подсказкой, что искать. */
    image: z.string().optional(),
    /** Подсказка фотографу/редактору, какое фото сюда нужно */
    imageHint: z.string().optional(),
  }),
});

// ── Каталог блоков (служебная страница, только на русском) ────
const blocksPage = defineCollection({
  loader: glob({ pattern: 'system/blocks.json', base: BASE, generateId: () => 'blocks' }),
  schema: z.object({
    seo,
    title: z.string(),
    lead: z.string(),
    mediaNote: z.string(),
    serviceNote: z.string(),
    /** Ролик для показа блока «Видео с YouTube» */
    youtube: z
      .object({
        videoId: z.string().default(''),
        poster: z.string().default(''),
        title: z.string().default('Видео'),
        caption: z.string().default(''),
      })
      .default({}),
    blocks: z.array(
      z.object({
        /** Совпадает с id блока в коде страницы — по нему подставляется показ */
        id: z.string(),
        name: z.string(),
        when: z.string(),
        needs: z.string().default(''),
        /** Свободная пометка: «берём», «не нужен», «переделать» */
        note: z.string().default(''),
      }),
    ),
  }),
});

// ── Страница «не найдено» (служебная, тексты на трёх языках) ──
const notFoundPage = defineCollection({
  loader: glob({ pattern: 'system/notfound.json', base: BASE, generateId: () => 'notfound' }),
  schema: z.object({
    seo,
    texts: z.array(z.object({ code: z.enum(['ru', 'it', 'en']), text: z.string() })),
  }),
});

export const collections = { settings, homePage, aboutPage, servicesPage, services, eventsPage, contactsPage, industriesPage, industries, blocksPage, notFoundPage };
