import type { Locale } from './config';
export const analyticsText: Record<Locale, { title: string; text: string; accept: string; reject: string; privacy: string }> = {
 ru: { title:'Разрешить аналитику?', text:'С вашего согласия мы используем Google Analytics, чтобы понимать, как посещают сайт. Без согласия аналитика не загружается. Изменить выбор можно внизу страницы.', accept:'Разрешить аналитику', reject:'Без аналитики', privacy:'Обработка данных' },
 it: { title:'Consentire l’analisi delle visite?', text:'Con il vostro consenso utilizziamo Google Analytics per capire come viene visitato il sito. Senza consenso il servizio non viene caricato. Potete modificare la scelta in fondo alla pagina.', accept:'Consenti l’analisi', reject:'Senza analisi', privacy:'Utilizzo dei dati' },
 en: { title:'Allow analytics?', text:'With your consent, we use Google Analytics to understand visits to this site. Analytics does not load without consent. You can change your choice at the bottom of the page.', accept:'Allow analytics', reject:'Without analytics', privacy:'Data use' },
};
