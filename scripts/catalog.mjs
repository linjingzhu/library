import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Top-level shelves, in tab order. A book names its shelf and its section within it.
export const SHELVES = [
  {id:'english', label:'English'},
  {id:'electronic', label:'Electronic'},
  {id:'tech', label:'Tech'},
  {id:'common', label:'Common'},
];

export async function loadCatalog(directory) {
  if (directory instanceof URL) directory = fileURLToPath(directory);
  const files = (await readdir(directory)).filter(name => name.endsWith('.json')).sort();
  const books = await Promise.all(files.map(async file => {
    try { return JSON.parse(await readFile(path.join(directory, file), 'utf8')); }
    catch (error) { throw new Error(`${file}: ${error.message}`); }
  }));
  validateCatalog(books);
  return books.sort((a,b) => (a.order ?? 1000) - (b.order ?? 1000) || a.id.localeCompare(b.id));
}

const DETAIL_KEYS = ['usage','translation','reading','stress','breakdown','grammarDeep','words','phrases','tenses','alternatives','pitfalls','patterns','drills'];
const normalizeSentence = value => value.toLowerCase().replace(/[^a-z0-9'’ ]+/g, ' ').replace(/\s+/g, ' ').trim();

// A sentence's study detail: every section is required and its shape is fixed, so all sentences read the same way.
export function validateExampleDetail(example, where) {
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const require = (condition, message) => { if (!condition) throw new Error(`${where}: ${message}`); };
  const english = value => text(value) && /[A-Za-z]/.test(value);
  const korean = value => text(value) && /[가-힣]/.test(value);
  const pair = (value, label) => require(Array.isArray(value) && value.length === 2 && english(value[0]) && korean(value[1]), `${label} must be [English sentence, Korean translation]`);
  const rows = (value, columns, min, max, label) => {
    require(Array.isArray(value) && value.length >= min && value.length <= max, `${label} needs ${min}-${max} rows`);
    for (const row of value) require(Array.isArray(row) && row.length === columns && row.every(text), `${label} rows need ${columns} non-empty cells`);
  };
  const detail = example.detail, sentence = normalizeSentence(example.english);
  require(detail && typeof detail === 'object' && !Array.isArray(detail), 'detail must be an object');
  for (const key of Object.keys(detail)) require(DETAIL_KEYS.includes(key), `unknown detail section ${key}`);
  for (const key of DETAIL_KEYS) require(key in detail, `detail.${key} is required`);
  require(text(detail.usage) && detail.usage.length >= 60, 'detail.usage must explain the situation (60+ characters)');
  const translation = detail.translation;
  require(translation && text(translation.literal) && text(translation.natural) && Array.isArray(translation.notes) && translation.notes.length >= 1 && translation.notes.every(text), 'detail.translation needs literal, natural and notes');
  require(text(detail.reading) && detail.reading.includes(' / ') && normalizeSentence(detail.reading.replace(/\//g, ' ')) === sentence, 'detail.reading must be the sentence with " / " chunk marks');
  require(Array.isArray(detail.stress) && detail.stress.length >= 2 && detail.stress.every(row => Array.isArray(row) && row.length === 2 && row.every(text) && sentence.split(' ').includes(normalizeSentence(row[0]).split(' ')[0])), 'detail.stress needs 2+ [word of the sentence, reason] rows');
  rows(detail.breakdown, 3, 3, 12, 'detail.breakdown');
  require(normalizeSentence(detail.breakdown.map(row => row[0]).join(' ')) === sentence, 'detail.breakdown chunks must reproduce the sentence');
  require(Array.isArray(detail.grammarDeep) && detail.grammarDeep.length >= 2, 'detail.grammarDeep needs 2+ items');
  for (const item of detail.grammarDeep) {
    require(item && text(item.point) && text(item.explain) && item.explain.length >= 80 && text(item.pattern) && text(item.caution) && Array.isArray(item.examples) && item.examples.length >= 2, 'detail.grammarDeep items need point, explain (80+ characters), pattern, 2+ examples and caution');
    item.examples.forEach(entry => pair(entry, 'detail.grammarDeep example'));
  }
  require(Array.isArray(detail.words) && detail.words.length >= 4, 'detail.words needs 4+ items');
  for (const word of detail.words) {
    require(word && text(word.word) && text(word.pos) && text(word.meaning) && text(word.nuance) && Array.isArray(word.collocations) && word.collocations.length >= 2 && word.collocations.every(text), 'detail.words items need word, pos, meaning, nuance and 2+ collocations');
    pair(word.example, 'detail.words example');
  }
  require(Array.isArray(detail.phrases) && detail.phrases.length <= 5, 'detail.phrases is a list of at most 5');
  for (const phrase of detail.phrases) { require(phrase && text(phrase.phrase) && text(phrase.meaning) && text(phrase.nuance), 'detail.phrases items need phrase, meaning and nuance'); pair(phrase.example, 'detail.phrases example'); }
  rows(detail.tenses, 3, 6, 12, 'detail.tenses');
  rows(detail.alternatives, 3, 3, 3, 'detail.alternatives');
  require(JSON.stringify(detail.alternatives.map(row => row[0])) === JSON.stringify(['격식','중립','구어체']), 'detail.alternatives must be 격식, 중립, 구어체');
  rows(detail.pitfalls, 3, 2, 3, 'detail.pitfalls');
  rows(detail.patterns, 3, 3, 3, 'detail.patterns');
  require(Array.isArray(detail.drills) && JSON.stringify(detail.drills.map(item => item && item.type)) === JSON.stringify(['빈칸','변형','번역']), 'detail.drills must be 빈칸, 변형, 번역');
  const words = value => normalizeSentence(value).split(' ').filter(Boolean);
  const wordDistance = (a, b) => { const x = words(a), y = words(b), row = Array.from({ length: y.length + 1 }, (_, j) => j); for (let i = 1; i <= x.length; i++) { let prev = row[0]; row[0] = i; for (let j = 1; j <= y.length; j++) { const keep = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (x[i - 1] === y[j - 1] ? 0 : 1)); prev = keep; } } return row[y.length]; };
  for (const drill of detail.drills) {
    require(text(drill.question) && text(drill.answer) && text(drill.explain), 'detail.drills items need question, answer and explain');
    require(drill.alt === undefined || (Array.isArray(drill.alt) && drill.alt.every(text)), 'detail.drills alt must be a list of strings');
  }
  const [blank, change, translate] = detail.drills;
  require((blank.question.match(/_{3,}/g) || []).length === 1, 'the 빈칸 drill needs exactly one blank ____');
  require(text(blank.hint) && korean(blank.hint), 'the 빈칸 drill needs a Korean hint');
  require(sentence.includes(normalizeSentence(blank.question.replace(/_{3,}/, blank.answer))), 'the 빈칸 drill must restate the example sentence with its answer filled in');
  require(text(change.base) && sentence.includes(normalizeSentence(change.base)), 'the 변형 drill base must be part of the example sentence');
  require(korean(change.question) && !normalizeSentence(change.question).includes(normalizeSentence(change.base)), 'the 변형 drill instruction must be Korean and must not repeat the base');
  require(normalizeSentence(change.answer) !== normalizeSentence(change.base), 'the 변형 drill answer must differ from its base');
  require(korean(translate.question), 'the 번역 drill question must be Korean');
  require(wordDistance(translate.answer, example.english) >= 3, 'the 번역 drill answer must not be a one-word variation of the example sentence');
}

export function validateCatalog(books) {
  const ids = new Set(), chapterIds = new Set();
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const validId = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  const strings = value => Array.isArray(value) && value.every(text);
  const require = (condition, message) => { if (!condition) throw new Error(message); };
  require(books.length > 0, 'content/에 자료 JSON이 필요합니다.');
  for (const book of books) {
    require(book && validId(book.id) && !ids.has(book.id), `Invalid or duplicate document id: ${book?.id}`);
    ids.add(book.id);
    for (const key of ['title','author','description']) require(text(book[key]), `${book.id}: ${key} required`);
    require(SHELVES.some(shelf => shelf.id === book.shelf), `${book.id}: shelf must be one of ${SHELVES.map(shelf => shelf.id).join(', ')}`);
    require(text(book.section), `${book.id}: section required`);
    require(book.pages === undefined || (Number.isInteger(book.pages) && book.pages > 0), `${book.id}: pages must be a positive integer`);
    require(book.order === undefined || Number.isFinite(book.order), `${book.id}: order must be a number`);
    require(book.category === undefined || text(book.category), `${book.id}: category must be text`);
    require(book.readerNote === undefined || text(book.readerNote), `${book.id}: readerNote must be non-empty text`);
    require(book.coverImage === undefined || (typeof book.coverImage === 'string' && /^[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp)$/.test(book.coverImage)), `${book.id}: coverImage must be a local PNG, JPEG or WebP filename`);
    require(book.color === undefined || ['blue','rose','sage'].includes(book.color), `${book.id}: color must be blue, rose or sage`);
    require(strings(book.notes), `${book.id}: notes must be a text array`);
    require(Array.isArray(book.chapters) && book.chapters.length > 0, `${book.id}: chapters required`);
    for (const chapter of book.chapters) {
      require(chapter && validId(chapter.id) && !chapterIds.has(chapter.id), `Invalid or duplicate chapter id: ${chapter?.id}`);
      chapterIds.add(chapter.id);
      for (const key of ['title','part','summary']) require(text(chapter[key]), `${chapter.id}: ${key} required`);
      require(chapter.application === undefined || text(chapter.application), `${chapter.id}: application must be non-empty text`);
      const range = chapter.pages;
      if (book.pages === undefined) require(range === undefined && chapter.quotes === undefined, `${chapter.id}: chapters of a book without pages cannot carry page ranges or quotes`);
      else require(Array.isArray(range) && range.length === 2 && range.every(Number.isInteger) && range[0] >= 1 && range[0] <= range[1] && range[1] <= book.pages, `${chapter.id}: invalid page range`);
      if (chapter.quotes !== undefined) {
        require(Array.isArray(chapter.quotes) && chapter.quotes.length <= 2, `${chapter.id}: quotes must be an array of at most two short passages`);
        for (const quote of chapter.quotes) {
          require(quote && text(quote.text) && quote.text.length <= 600, `${chapter.id}: quote must be non-empty and short`);
          require(Number.isInteger(quote.page) && quote.page >= range[0] && quote.page <= range[1], `${chapter.id}: quote page must be within the chapter source range`);
        }
      }
      require(Array.isArray(chapter.points) && chapter.points.length > 0, `${chapter.id}: points required`);
      for (const point of chapter.points) {
        require(point && text(point.title) && text(point.text), `${chapter.id}: invalid point`);
        require(point.page === undefined || (book.pages !== undefined && Number.isInteger(point.page) && point.page >= 1 && point.page <= book.pages), `${chapter.id}: invalid point page`);
      }
      require(strings(chapter.practice) && strings(chapter.keywords), `${chapter.id}: practice and keywords must be text arrays`);
      if (chapter.examples !== undefined) {
        require(Array.isArray(chapter.examples) && chapter.examples.length > 0, `${chapter.id}: examples must be a non-empty list`);
        for (const example of chapter.examples) {
          require(example && validId(example.id) && text(example.english) && text(example.korean), `${chapter.id}: every example needs id, english and korean`);
          if (example.detail !== undefined) validateExampleDetail(example, `${chapter.id}/${example.id}`);
          else {
            const where = `${chapter.id}/${example.id}`, pairs = value => Array.isArray(value) && value.every(row => Array.isArray(row) && row.length === 2 && row.every(text));
            require(strings(example.grammar) && pairs(example.vocabulary) && pairs(example.idioms) && pairs(example.tenseVariants) && example.tenseVariants.length > 0, `${where}: an example without detail needs grammar, vocabulary, idioms and tenseVariants`);
          }
        }
      }
    }
  }
}
