import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Все тексты сайта лежат в src/content/<язык>/...
// Сейчас язык один — ru. Когда появится итальянский, рядом ляжет папка it/
// и все коллекции подхватят её автоматически: шаблоны менять не придётся.
const BASE = './src/content';

/** Блок SEO — одинаковый на всех страницах. */
const seo = z.object({
  title: z.string(),
  description: z.string(),
  /** Картинка для превью в мессенджерах и соцсетях. Необязательна. */
  ogImage: z.string().optional(),
});

/** Кнопка-ссылка. */
const cta = z.object({
  label: z.string(),
  href: z.string(),
});

// ── Общие настройки: контакты, офисы, реквизиты ───────────────
const settings = defineCollection({
  loader: glob({ pattern: '*/settings.json', base: BASE }),
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
  loader: glob({ pattern: '*/pages/home.json', base: BASE }),
  schema: z.object({
    seo,
    hero: z.object({
      title: z.string(),
      lead: z.string(),
      cta,
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
      items: z.array(
        z.object({
          value: z.string(),
          label: z.string(),
        }),
      ),
    }),
  }),
});

// ── Страница «Услуги» (шапка; сами услуги — отдельные файлы) ───
const servicesPage = defineCollection({
  loader: glob({ pattern: '*/pages/services.json', base: BASE }),
  schema: z.object({ seo, title: z.string(), lead: z.string() }),
});

// ── Страница «Отрасли» (шапка; сами отрасли — отдельные файлы) ─
const industriesPage = defineCollection({
  loader: glob({ pattern: '*/pages/industries.json', base: BASE }),
  schema: z.object({ seo, title: z.string(), lead: z.string() }),
});

// ── Страница «О компании» ─────────────────────────────────────
const aboutPage = defineCollection({
  loader: glob({ pattern: '*/pages/about.json', base: BASE }),
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
  loader: glob({ pattern: '*/pages/contacts.json', base: BASE }),
  schema: z.object({ seo, title: z.string(), lead: z.string() }),
});

// ── Услуги: по файлу на услугу ────────────────────────────────
const services = defineCollection({
  loader: glob({ pattern: '*/services/*.md', base: BASE }),
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
  loader: glob({ pattern: '*/industries/*.md', base: BASE }),
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

export const collections = {
  settings,
  homePage,
  servicesPage,
  industriesPage,
  aboutPage,
  contactsPage,
  services,
  industries,
};
