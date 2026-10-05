import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadCatalog, validateCatalog} from '../scripts/catalog.mjs';
const books=await loadCatalog(new URL('../content/',import.meta.url));
test('all sources have valid navigable chapters and in-range source references',()=>{
  const ids=new Set();
  for(const book of books){
    assert.ok(book.title&&book.author&&book.description&&Array.isArray(book.notes));
    assert.ok(book.chapters.length>0);
    for(const c of book.chapters){
      assert.match(c.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.ok(!ids.has(c.id),`duplicate ${c.id}`);ids.add(c.id);
      assert.ok(c.title&&c.part&&c.summary);
      assert.equal(c.pages.length,2);assert.ok(c.pages[0]>=1&&c.pages[0]<=c.pages[1]&&c.pages[1]<=book.pages,`${c.id} page range`);
      assert.ok(c.points.length);assert.ok(Array.isArray(c.practice)&&Array.isArray(c.keywords));
      for(const p of c.points){assert.ok(p.title&&p.text);if(p.page)assert.ok(p.page>=1&&p.page<=book.pages,`${c.id} point page`);}
    }
  }
});
test('initial sources retain their original page and module coverage',()=>{
  assert.deepEqual(['conflict','love','tao'].map(id=>{const b=books.find(b=>b.id===id);return [b.pages,b.chapters.length];}),[[466,36],[256,20],[230,18]]);
});
test('a fourth JSON is discovered, ordered, and validated without an application change',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'library-catalog-'));
  try {
    const added={id:'new-pdf',title:'새 PDF',author:'저자',description:'독립 자료',pages:1,notes:[],order:5,chapters:[{id:'new-pdf-01',title:'새 주제',part:'개요',summary:'새 자료 요약',pages:[1,1],points:[{title:'개념',text:'새 설명'}],practice:[],keywords:[]}]};
    const existing=Array.from({length:3},(_,i)=>({...structuredClone(added),id:`fixture-${i}`,order:10+i,chapters:[{...structuredClone(added.chapters[0]),id:`fixture-${i}-01`}]}));
    for(const b of [...existing,added])await writeFile(path.join(directory,`${b.id}.json`),JSON.stringify(b));
    const catalog=await loadCatalog(directory);
    assert.equal(catalog.length,existing.length+1);
    assert.equal(catalog[0].id,added.id);
    assert.deepEqual(catalog.find(b=>b.id===added.id),added);
    assert.throws(()=>validateCatalog([...catalog,added]),/duplicate document id/);
    const invalid=structuredClone(added);invalid.id='another';
    assert.throws(()=>validateCatalog([...catalog,invalid]),/duplicate chapter id/);
    invalid.chapters[0].id='another-01';invalid.chapters[0].pages=[1,2];
    assert.throws(()=>validateCatalog([invalid]),/invalid page range/);
    await writeFile(path.join(directory,'broken.json'),'{');
    await assert.rejects(loadCatalog(directory),/broken.json/);
  } finally {await rm(directory,{recursive:true,force:true});}
});
test('Tao coverage includes every numbered entry once, 001 through 145',()=>{
  const nums=books.find(b=>b.id==='tao').chapters.flatMap(c=>c.points.map(p=>p.title.match(/^(\d{3})\b/)?.[1])).filter(Boolean).map(Number).sort((a,b)=>a-b);
  assert.deepEqual(nums,Array.from({length:145},(_,i)=>i+1));
});
test('content does not contain unfinished placeholders',()=>{
  for(const b of books)assert.doesNotMatch(JSON.stringify(b),/TODO|TBD|LOREM IPSUM|undefined/i);
});

test('short quotations require exact source positions inside their topic range',()=>{
  const fixture=structuredClone(books[0]);
  const chapter=fixture.chapters[0];
  chapter.quotes=[{text:'검증용 문장',page:chapter.pages[0]}];
  assert.doesNotThrow(()=>validateCatalog([fixture]));
  for(const invalid of [{text:'',page:chapter.pages[0]},{text:'문장',page:0},{text:'문장',page:chapter.pages[1]+1},{text:'가'.repeat(601),page:chapter.pages[0]}]){
    chapter.quotes=[invalid];
    assert.throws(()=>validateCatalog([fixture]),/quote/);
  }
  chapter.quotes=Array.from({length:3},()=>({text:'문장',page:chapter.pages[0]}));
  assert.throws(()=>validateCatalog([fixture]),/at most two/);
});

test('reader-facing copy does not mention the source file format or upload controls',async()=>{
  for(const book of books)assert.doesNotMatch(JSON.stringify(book),/\bPDF\b/i);
  const ui=(await Promise.all(['app.js','index.html'].map(file=>readFile(new URL(`../src/${file}`,import.meta.url),'utf8')))).join('\n');
  assert.doesNotMatch(ui,/\bPDF\b|type="file"|createObjectURL|data-source/i);
});
