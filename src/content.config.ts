import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Все тексты сайта лежат в src/content/<раздел>/<язык>/...
//
// Порядок «раздел, потом язык» выбран не случайно: именно такую структуру
// понимает CMS. Благодаря ей она показывает языковые версии рядом и умеет
// переводить одну в другую по кнопке.
const BASE = './src/content';

// Короткие и предсказуемые id: по ним потом ищем нужный язык.

/** settings/ru.json → 'ru' (язык в имени файла) */
const idFromFileName = ({ entry }: { entry: string }) =>
  entry.split('/').pop()!.replace(/\.[^.]+$/, '');

/** pages/ru/home.json → 'ru' (язык в названии папки) */
const idFromFolder = ({ entry }: { entry: string }) =>
  entry.split('/').slice(-2, -1)[0];

/** services/ru/01-issledovanie-rynka.md → 'ru/01-issledovanie-rynka' */
const idLocaleAndSlug = ({ entry }: { entry: string }) =>
  entry.replace(/\.[^.]+$/, '').split('/').slice(-2).join('/');

/** Блок SEO — одинаковый на всех страницах. */
const seo = z.object({
  title: z.string(),
  description: z.string(),
  /** Картинка для превью в мессенджерах и соцсетях. Необязательна. */
  ogImage: z.string().optional(),
});

/**
 * Кнопка-ссылка.
 * page — название страницы, а не адрес: адреса разные на разных языках
 * и заданы в src/i18n/routes.ts.
 */
const cta = z.object({
  label: z.string(),
  page: z.enum(['home', 'services', 'industries', 'about', 'contacts']),
});

// ── Общие настройки: контакты, офисы, реквизиты ───────────────
const settings = defineCollection({
  loader: glob({ pattern: 'settings/*.json', base: BASE, generateId: idFromFileName }),
  schema: z.object({
    company: z.object({
      name: z.string(),
      tagline: z.string(),
    }),
    phones: z.array(
      z.object({
        label: z.string(),
        /** Как показывать на экране */
        display: z.string(),
        /** Как звонить: только цифры и плюс */
        tel: z.string(),
      }),
    ),
    email: z.string(),
    messengers: z.array(
      z.object({
        /** telegram | whatsapp | viber */
        type: z.enum(['telegram', 'whatsapp', 'viber']),
        label: z.string(),
        href: z.string(),
      }),
    ),
    offices: z.array(
      z.object({
        city: z.string(),
        address: z.string(),
        note: z.string().optional(),
      }),
    ),
    legal: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      )
      .default([]),
  }),
});

// ── Главная страница ──────────────────────────────────────────
const homePage = defineCollection({
  loader: glob({ pattern: 'pages/*/home.json', base: BASE, generateId: idFromFolder }),
  schema: z.object({
    seo,
    hero: z.object({
      eyebrow: z.string(),
      /** Заголовок разбит на строки — так задаются переносы в вёрстке */
      titleLines: z.array(z.string()),
      lead: z.string(),
      cta,
      /**
       * Страны на карте: порядок и подписи на языке страницы.
       * id должен совпадать с id в scripts/build-map.mjs — оттуда берутся
       * очертания. Чтобы добавить страну, её нужно сначала завести там.
       */
      map: z.object({
        countries: z.array(
          z.object({
            id: z.enum(['italy', 'belarus', 'russia']),
            label: z.string(),
          }),
        ),
      }),
    }),
    whatWeDo: z.object({
      eyebrow: z.string(),
      title: z.string(),
      cards: z.array(
        z.object({
          title: z.string(),
          text: z.string(),
        }),
      ),
    }),
    industries: z.object({
      eyebrow: z.string(),
      title: z.string(),
      cta,
    }),
    /** Короткая фраза-заявление между блоками. */
    statement: z.object({
      text: z.string(),
      note: z.string().optional(),
    }),
    howWeWork: z.object({
      eyebrow: z.string(),
      title: z.string(),
      steps: z.array(
        z.object({
          title: z.string(),
          text: z.string(),
        }),
      ),
    }),
    stats: z.object({
      eyebrow: z.string(),
      items: z.array(
        z.object({
          /** Число, которое «набегает» при прокрутке: 8, 60, 2, 5 */
          value: z.number(),
          /** Приписка после числа, если нужна: «+» */
          suffix: z.string().optional(),
          label: z.string(),
        }),
      ),
    }),
  }),
});

// ── Страница «Услуги» (шапка; сами услуги — отдельные файлы) ───
const servicesPage = defineCollection({
  loader: glob({ pattern: 'pages/*/services.json', base: BASE, generateId: idFromFolder }),
  schema: z.object({ seo, title: z.string(), lead: z.string() }),
});

// ── Страница «Отрасли» (шапка; сами отрасли — отдельные файлы) ─
const industriesPage = defineCollection({
  loader: glob({ pattern: 'pages/*/industries.json', base: BASE, generateId: idFromFolder }),
  schema: z.object({ seo, title: z.string(), lead: z.string() }),
});

// ── Страница «О компании» ─────────────────────────────────────
const aboutPage = defineCollection({
  loader: glob({ pattern: 'pages/*/about.json', base: BASE, generateId: idFromFolder }),
  schema: z.object({
    seo,
    title: z.string(),
    lead: z.string(),
    story: z.array(z.string()),
    approach: z.object({
      title: z.string(),
      items: z.array(z.object({ title: z.string(), text: z.string() })),
    }),
    team: z.object({
      title: z.string(),
      note: z.string(),
      people: z.array(
        z.object({
          name: z.string(),
          role: z.string(),
          about: z.string(),
          /** Путь к фото. Пока пусто — на месте фото стоит заглушка. */
          photo: z.string().optional(),
        }),
      ),
    }),
  }),
});

// ── Страница «Контакты» ───────────────────────────────────────
const contactsPage = defineCollection({
  loader: glob({ pattern: 'pages/*/contacts.json', base: BASE, generateId: idFromFolder }),
  schema: z.object({ seo, title: z.string(), lead: z.string() }),
});

// ── Услуги: по файлу на услугу ────────────────────────────────
const services = defineCollection({
  loader: glob({ pattern: 'services/*/*.md', base: BASE, generateId: idLocaleAndSlug }),
  schema: z.object({
    title: z.string(),
    /** Порядок вывода на странице */
    order: z.number(),
    /** Что входит в услугу */
    items: z.array(z.string()),
  }),
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

export const collections = {
  blocksPage,
  notFoundPage,
  settings,
  homePage,
  servicesPage,
  industriesPage,
  aboutPage,
  contactsPage,
  services,
  industries,
};
