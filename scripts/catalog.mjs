import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

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
    require(Number.isInteger(book.pages) && book.pages > 0, `${book.id}: pages must be a positive integer`);
    require(book.order === undefined || Number.isFinite(book.order), `${book.id}: order must be a number`);
    require(book.category === undefined || text(book.category), `${book.id}: category must be text`);
    require(book.coverImage === undefined || (typeof book.coverImage === 'string' && /^[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp)$/.test(book.coverImage)), `${book.id}: coverImage must be a local PNG, JPEG or WebP filename`);
    require(book.color === undefined || ['blue','rose','sage'].includes(book.color), `${book.id}: color must be blue, rose or sage`);
    require(strings(book.notes), `${book.id}: notes must be a text array`);
    require(Array.isArray(book.chapters) && book.chapters.length > 0, `${book.id}: chapters required`);
    for (const chapter of book.chapters) {
      require(chapter && validId(chapter.id) && !chapterIds.has(chapter.id), `Invalid or duplicate chapter id: ${chapter?.id}`);
      chapterIds.add(chapter.id);
      for (const key of ['title','part','summary']) require(text(chapter[key]), `${chapter.id}: ${key} required`);
      const range = chapter.pages;
      require(Array.isArray(range) && range.length === 2 && range.every(Number.isInteger) && range[0] >= 1 && range[0] <= range[1] && range[1] <= book.pages, `${chapter.id}: invalid page range`);
      require(Array.isArray(chapter.points) && chapter.points.length > 0, `${chapter.id}: points required`);
      for (const point of chapter.points) {
        require(point && text(point.title) && text(point.text), `${chapter.id}: invalid point`);
        require(point.page === undefined || (Number.isInteger(point.page) && point.page >= 1 && point.page <= book.pages), `${chapter.id}: invalid point page`);
      }
      require(strings(chapter.practice) && strings(chapter.keywords), `${chapter.id}: practice and keywords must be text arrays`);
    }
  }
}
