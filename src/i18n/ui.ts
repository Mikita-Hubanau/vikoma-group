import type { Locale } from './config';

/**
 * Надписи интерфейса — всё, что не является «контентом страницы»:
 * пункты меню, подписи кнопок, заголовки служебных блоков.
 *
 * Тексты самих страниц лежат отдельно, в src/content/.
 */
export const ui = {
  ru: {
    nav: [
      { label: 'Услуги', path: '/uslugi/' },
      { label: 'Отрасли', path: '/otrasli/' },
      { label: 'О компании', path: '/o-kompanii/' },
      { label: 'Контакты', path: '/kontakty/' },
    ],
    skipToContent: 'Перейти к содержимому',
    home: 'Главная',
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
    allServices: 'Все услуги',
    photoPlaceholder: 'Фото',
    copyright: 'Все права защищены',
  },
} satisfies Record<Locale, Record<string, unknown>>;

/** Достаёт надписи для нужного языка. */
export function useUI(locale: Locale) {
  return ui[locale];
}
