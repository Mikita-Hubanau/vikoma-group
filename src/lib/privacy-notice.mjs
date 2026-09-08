/** Small, deterministic helpers shared by Astro and the regression tests.
 * No HTML/Markdown from the CMS is executed. Only known contact tokens are linked.
 */
export const privacyUI = Object.freeze({
  ru: { close:'Закрыть', label:'VIKUB · Конфиденциальность', draft:'Рабочая редакция — требуется юридическое завершение', contact:'Вопросы о персональных данных', authority:'Garante — итальянский орган по защите данных' },
  it: { close:'Chiudi', label:'VIKUB · Privacy', draft:'Bozza — completamento giuridico necessario', contact:'Domande sui dati personali', authority:'Garante per la protezione dei dati personali' },
  en: { close:'Close', label:'VIKUB · Privacy', draft:'Draft — legal completion required', contact:'Personal data enquiries', authority:'Garante — Italian data protection authority' },
});
export function privacyTextParts(text) {
  if (typeof text !== 'string') throw new TypeError('Privacy paragraph must be a string');
  const targets = {
    'info@vikub.com':'mailto:info@vikub.com',
    '+39 328 2303160':'tel:+393282303160',
    'www.garanteprivacy.it':'https://www.garanteprivacy.it/',
    'policies.google.com/privacy':'https://policies.google.com/privacy',
    'policies.google.com/privacy/frameworks':'https://policies.google.com/privacy/frameworks',
  };
  return text.split(/(info@vikub\.com|\+39 328 2303160|www\.garanteprivacy\.it|policies\.google\.com\/privacy(?:\/frameworks)?)/g)
    .filter(Boolean).map((value) => ({ text:value, href:targets[value] || '' }));
}
