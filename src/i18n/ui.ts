import type { Locale } from './config';
import type { RouteKey } from './routes';

/**
 * Надписи интерфейса — всё, что не является «контентом страницы»:
 * пункты меню, подписи кнопок, заголовки служебных блоков.
 *
 * Тексты самих страниц лежат отдельно, в src/content/.
 */
type Dictionary = {
  nav: Record<RouteKey, string>;
  skipToContent: string;
  language: string;
  discussProject: string;
  writeUs: string;
  contactTitle: string;
  contactLead: string;
  phone: string;
  email: string;
  messengers: string;
  offices: string;
  legalDetails: string;
  whatsIncluded: string;
  contactWays: string;
  team: string;
  allServices: string;
  photoPlaceholder: string;
  photoNeeded: string;
  copyright: string;
  sections: string;
};

export const ui: Record<Locale, Dictionary> = {
  ru: {
    nav: {
      home: 'Главная',
      services: 'Услуги',
      industries: 'Отрасли',
      about: 'О компании',
      contacts: 'Контакты',
    },
    skipToContent: 'Перейти к содержимому',
    language: 'Язык сайта',
    discussProject: 'Обсудить проект',
    writeUs: 'Напишите нам',
    contactTitle: 'Обсудим ваш проект',
    contactLead:
      'Расскажите, что за продукт и какая задача. Первый разговор бесплатный и ни к чему не обязывает.',
    phone: 'Телефон',
    email: 'Почта',
    messengers: 'Мессенджеры',
    offices: 'Офисы',
    legalDetails: 'Реквизиты',
    whatsIncluded: 'Что входит',
    contactWays: 'Как связаться',
    team: 'Команда',
    allServices: 'Все услуги',
    photoPlaceholder: 'Фото',
    photoNeeded: 'Нужен снимок',
    copyright: 'Все права защищены',
    sections: 'Разделы',
  },

  it: {
    nav: {
      home: 'Home',
      services: 'Servizi',
      industries: 'Settori',
      about: 'Azienda',
      contacts: 'Contatti',
    },
    skipToContent: 'Vai al contenuto',
    language: 'Lingua del sito',
    discussProject: 'Parliamo del progetto',
    writeUs: 'Scriveteci',
    contactTitle: 'Parliamo del vostro progetto',
    contactLead:
      'Raccontateci il prodotto e l’obiettivo. Il primo confronto è gratuito e senza impegno.',
    phone: 'Telefono',
    email: 'Email',
    messengers: 'Messaggistica',
    offices: 'Sedi',
    legalDetails: 'Dati societari',
    whatsIncluded: 'Cosa comprende',
    contactWays: 'Come contattarci',
    team: 'Team',
    allServices: 'Tutti i servizi',
    photoPlaceholder: 'Foto',
    photoNeeded: 'Foto da inserire',
    copyright: 'Tutti i diritti riservati',
    sections: 'Sezioni',
  },

  en: {
    nav: {
      home: 'Home',
      services: 'Services',
      industries: 'Industries',
      about: 'About',
      contacts: 'Contact',
    },
    skipToContent: 'Skip to content',
    language: 'Site language',
    discussProject: 'Discuss a project',
    writeUs: 'Get in touch',
    contactTitle: 'Let’s discuss your project',
    contactLead:
      'Tell us about the product and the goal. The first conversation is free and commits you to nothing.',
    phone: 'Phone',
    email: 'Email',
    messengers: 'Messengers',
    offices: 'Offices',
    legalDetails: 'Company details',
    whatsIncluded: 'What’s included',
    contactWays: 'How to reach us',
    team: 'Team',
    allServices: 'All services',
    photoPlaceholder: 'Photo',
    photoNeeded: 'Photo needed',
    copyright: 'All rights reserved',
    sections: 'Sections',
  },
};

/** Достаёт надписи для нужного языка. */
export function useUI(locale: Locale): Dictionary {
  return ui[locale];
}
