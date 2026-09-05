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
  primaryNavigation: string;
  partnerLabel: string;
  unavailable: string;
  addressPending: string;
  socialNetworks: string;
  privacySettings: string;
  privacy: string;
  skipToContent: string;
  language: string;
  discussProject: string;
  /** Короткий вариант для узкого экрана */
  discussProjectShort: string;
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
  /** Служебные ссылки в подвале — видны только вам */
  editSite: string;
  editOff: string;
  blocksCatalogue: string;
  allTexts: string;
};

export const ui: Record<Locale, Dictionary> = {
  ru: {
    primaryNavigation: "Основная навигация",
    partnerLabel: "Партнёр",
    unavailable: "Контакт пока не опубликован",
    addressPending: "Адрес офиса уточняется",
    socialNetworks: "Социальные сети",
    privacySettings: "Настройки аналитики",
    privacy: "Обработка данных",
    nav: {
      home: 'Главная',
      services: 'Услуги',
      industries: 'Отрасли',
      events: 'Мероприятия',
      about: 'О нас',
      contacts: 'Контакты',
    },
    skipToContent: 'Перейти к содержимому',
    language: 'Язык сайта',
    discussProject: 'Обсудить проект',
    discussProjectShort: 'Написать',
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
    editSite: 'Редактировать',
    editOff: 'Выключить правку',
    blocksCatalogue: 'Каталог блоков',
    allTexts: 'Все тексты',
  },

  it: {
    primaryNavigation: "Navigazione principale",
    partnerLabel: "Partner",
    unavailable: "Contatto non ancora pubblicato",
    addressPending: "Indirizzo della sede da confermare",
    socialNetworks: "Social network",
    privacySettings: "Impostazioni di analisi",
    privacy: "Utilizzo dei dati",
    nav: {
      home: 'Home',
      services: 'Servizi',
      industries: 'Settori',
      events: 'Eventi',
      about: 'Chi siamo',
      contacts: 'Contatti',
    },
    skipToContent: 'Vai al contenuto',
    language: 'Lingua del sito',
    discussProject: 'Parliamo del progetto',
    discussProjectShort: 'Scrivici',
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
    editSite: 'Modifica',
    editOff: 'Esci dalla modifica',
    blocksCatalogue: 'Catalogo blocchi',
    allTexts: 'Tutti i testi',
  },

  en: {
    primaryNavigation: "Main navigation",
    partnerLabel: "Partner",
    unavailable: "Contact details not yet published",
    addressPending: "Office address to be confirmed",
    socialNetworks: "Social networks",
    privacySettings: "Analytics settings",
    privacy: "Data use",
    nav: {
      home: 'Home',
      services: 'Services',
      industries: 'Industries',
      events: 'Events',
      about: 'About us',
      contacts: 'Contact',
    },
    skipToContent: 'Skip to content',
    language: 'Site language',
    discussProject: 'Discuss a project',
    discussProjectShort: 'Contact us',
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
    editSite: 'Edit',
    editOff: 'Exit edit mode',
    blocksCatalogue: 'Block catalogue',
    allTexts: 'All texts',
  },
};

/** Достаёт надписи для нужного языка. */
export function useUI(locale: Locale): Dictionary {
  return ui[locale];
}
