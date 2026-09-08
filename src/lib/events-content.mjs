/** Validate both approved event content formats without inventing translations.
 * RU/IT use a six-item agenda; EN keeps its grouped list without company presentations.
 * Shared by the Astro schema and the pre-build content check.
 */
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const array = (value) => Array.isArray(value) ? value : [];

export function eventContentIssues(page) {
  const issues = [];
  const require = (condition, message) => { if (!condition) issues.push(message); };
  const benefits = array(page.benefits?.items);
  require(benefits.length === 4, 'Нужны ровно четыре результата семинара.');
  require(hasText(page.benefits?.title), 'Нужен заголовок результатов семинара.');
  require(benefits.every(item => hasText(item.title) && hasText(item.text)), 'Карточки результатов не должны быть пустыми.');
  require(hasText(page.programTitle) && hasText(page.programNote), 'Нужны заголовок и примечание программы.');
  if (page.agenda) {
    const { agenda } = page;
    require(array(page.program).length === 0 && array(page.programGroups).length === 0,
      'Новая программа не должна дублироваться старым списком и группами.');
    require(hasText(page.benefits?.subtitle), 'Нужен подзаголовок результатов семинара.');
    require(hasText(agenda.format), 'Нужен подзаголовок о формате программы.');
    require(array(agenda.items).length === 6, 'В основной программе должно быть шесть пунктов.');
    for (const [index, item] of array(agenda.items).entries()) {
      require(hasText(item.title), `Пункт ${index + 1}: нужен заголовок.`);
      require(typeof item.speaker === 'string', `Пункт ${index + 1}: укажите спикера или пустую строку.`);
      require(array(item.paragraphs).length > 0 && array(item.paragraphs).every(hasText),
        `Пункт ${index + 1}: нужен непустой текст.`);
    }
    require(hasText(agenda.optionalTitle), 'Опциональные пункты должны быть явно помечены.');
    require(array(agenda.optionalItems).length === 2 && array(agenda.optionalItems).every(hasText),
      'Нужны ровно два непустых опциональных пункта.');
  } else {
    const program = array(page.program), groups = array(page.programGroups);
    require(program.length === 7 && program.every(hasText), 'В английской программе должно быть семь пунктов без презентаций компаний.');
    require(groups.length === 3, 'В прежней английской программе должно остаться три группы.');
    const covered = [0, ...groups.flatMap(group => array(group.indices)), program.length - 1];
    require(covered.length === 7 && new Set(covered).size === 7 && [...covered].sort((a,b) => a-b).join(',') === '0,1,2,3,4,5,6',
      'Прежняя программа должна выводить каждый пункт ровно один раз.');
  }
  return issues;
}

/** Compare shared translation keys, not the intentionally different agendas. */
export function eventSharedFields(page) {
  const { agenda, program, programGroups, benefits, ...shared } = page;
  const { subtitle, ...sharedBenefits } = benefits ?? {};
  return { ...shared, benefits: sharedBenefits };
}
