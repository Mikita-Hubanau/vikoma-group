/**
 * Contacts page copy — approved revision dated 2026-09-07.
 * This file is the source of truth for the revised page, in all three languages.
 * The existing CMS still supplies SEO, privacy/legal content and form status texts.
 * Keep social URLs empty until the owner approves the actual account addresses.
 */
export const CONTACT_DETAILS = {
  italy: { phone: '+39 328 2303160', tel: '+393282303160' },
  belarus: { phone: '+375 29 6409880', tel: '+375296409880' },
  email: 'info@vikub.com',
};

export const CONTACT_SOCIALS = [
  { label: 'LinkedIn', url: '' },
  { label: 'Telegram', url: '' },
];

export const CONTACT_COPY = {
  ru: {
    title: 'Свяжитесь с нами',
    contactsLabel: 'Контакты',
    italy: 'Италия',
    belarus: 'Беларусь',
    email: 'Email',
    socialTitle: 'Социальные сети',
    socialPending: 'Ссылки будут добавлены после согласования.',
    pendingLabel: 'ссылка пока не опубликована',
    form: {
      title: 'Обсудить проект',
      lead: 'Расскажите нам, что вы хотите сделать — выйти на рынок, найти партнёра, рассмотреть инвестиционный проект или решить другую бизнес-задачу. Мы свяжемся с вами и обсудим возможные следующие шаги.',
      followUp: 'Не уверены, подходит ли ваш проект для нашего сопровождения? Напишите нам — мы рассмотрим ваш запрос и честно скажем, можем ли быть полезны.',
      requiredNote: 'Все поля обязательны для заполнения. Необходимо согласие на обработку данных.',
      name: 'Имя',
      email: 'Email',
      phone: 'Телефон',
      company: 'Компания',
      service: 'Чем мы можем вам помочь?',
      servicePlaceholder: 'Выберите вариант',
      message: 'Сообщение',
      consent: 'Я согласен(на) на обработку моих персональных данных.',
      submit: 'Отправить запрос',
      directEmail: 'Также можно написать нам на email:',
      services: [
        'Выход на рынок Беларуси',
        'Выход на рынок России / ЕАЭС',
        'Поиск торговых партнёров',
        'Инвестиции в Беларуси / ЕАЭС',
        'Поиск поставщика / производителя в Италии',
        'Поиск товара / оборудования в Италии',
        'Я хочу понять, есть ли смысл в моём проекте',
        'Другое',
      ],
    },
  },
  it: {
    title: 'Contattaci',
    contactsLabel: 'Contatti',
    italy: 'Italia',
    belarus: 'Bielorussia',
    email: 'Email',
    socialTitle: 'Social network',
    socialPending: 'I link saranno aggiunti dopo la conferma.',
    pendingLabel: 'link non ancora pubblicato',
    form: {
      title: 'Parliamo del tuo progetto',
      lead: 'Raccontaci cosa vorresti fare: entrare in un nuovo mercato, trovare un partner, valutare un progetto di investimento o affrontare un’altra esigenza aziendale. Ti contatteremo per discutere i possibili passi successivi.',
      followUp: 'Non sai se il tuo progetto rientra nei nostri servizi? Scrivici: esamineremo la tua richiesta e ti diremo con sincerità se possiamo esserti utili.',
      requiredNote: 'Tutti i campi sono obbligatori. È richiesto il consenso al trattamento dei dati.',
      name: 'Nome',
      email: 'Email',
      phone: 'Telefono',
      company: 'Azienda',
      service: 'Come possiamo aiutarti?',
      servicePlaceholder: 'Seleziona un’opzione',
      message: 'Messaggio',
      consent: 'Acconsento al trattamento dei miei dati personali.',
      submit: 'Invia la richiesta',
      directEmail: 'Puoi anche scriverci via email:',
      services: [
        'Ingresso nel mercato bielorusso',
        'Ingresso nel mercato russo / UEE',
        'Ricerca di partner commerciali',
        'Investimenti in Bielorussia / UEE',
        'Ricerca di un fornitore / produttore in Italia',
        'Ricerca di prodotti / attrezzature in Italia',
        'Vorrei capire se il mio progetto ha senso',
        'Altro',
      ],
    },
  },
  en: {
    title: 'Get in touch',
    contactsLabel: 'Contacts',
    italy: 'Italy',
    belarus: 'Belarus',
    email: 'Email',
    socialTitle: 'Social media',
    socialPending: 'Links will be added once confirmed.',
    pendingLabel: 'link not yet published',
    form: {
      title: 'Discuss your project',
      lead: 'Tell us what you would like to do — enter a market, find a partner, explore an investment project or address another business need. We will get in touch to discuss possible next steps.',
      followUp: 'Not sure whether your project is a good fit for our services? Write to us — we will review your enquiry and give you an honest assessment of whether we can help.',
      requiredNote: 'All fields are required. Consent to data processing is also required.',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      service: 'How can we help you?',
      servicePlaceholder: 'Select an option',
      message: 'Message',
      consent: 'I agree to the processing of my personal data.',
      submit: 'Send enquiry',
      directEmail: 'You can also contact us by email:',
      services: [
        'Entering the Belarusian market',
        'Entering the Russian / EAEU market',
        'Finding trading partners',
        'Investments in Belarus / EAEU',
        'Finding a supplier / manufacturer in Italy',
        'Finding products / equipment in Italy',
        'I would like to understand whether my project makes sense',
        'Other',
      ],
    },
  },
};

/** @param {'it' | 'en' | 'ru'} locale */
export function getContactsCopy(locale) {
  const copy = CONTACT_COPY[locale];
  if (!copy) throw new Error(`Unsupported contacts locale: ${locale}`);
  return copy;
}

/**
 * An empty URL is deliberately rendered as text, not as a fake link.
 * Reject invalid or non-HTTPS URLs before they reach the generated HTML.
 * @param {{label: string, url: string}[]} [items]
 */
export function getContactSocials(items = CONTACT_SOCIALS) {
  return items.map(({ label, url }) => {
    const href = url.trim();
    if (href) {
      let parsed;
      try { parsed = new URL(href); }
      catch { throw new Error(`Invalid social URL for ${label}`); }
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
        throw new Error(`Social URL for ${label} must be an HTTPS URL without credentials`);
      }
    }
    return { label, href };
  });
}
