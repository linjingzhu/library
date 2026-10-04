import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const books=await Promise.all(['conflict','love','tao'].map(async id=>JSON.parse(await readFile(new URL(`../content/${id}.json`,import.meta.url),'utf8'))));
test('all three sources have valid navigable chapters and in-range source references',()=>{
  const ids=new Set();
  assert.equal(books.reduce((n,b)=>n+b.pages,0),952);
  for(const book of books){
    assert.ok(book.title&&book.author&&book.description&&book.notes.length);
    assert.ok(book.chapters.length>=15);
    for(const c of book.chapters){
      assert.match(c.id,/^[a-z]+-[0-9]+$/);assert.ok(!ids.has(c.id),`duplicate ${c.id}`);ids.add(c.id);
      assert.ok(c.title&&c.part&&c.summary);
      assert.equal(c.pages.length,2);assert.ok(c.pages[0]>=1&&c.pages[0]<=c.pages[1]&&c.pages[1]<=book.pages,`${c.id} page range`);
      assert.ok(c.points.length);assert.ok(Array.isArray(c.practice)&&Array.isArray(c.keywords));
      for(const p of c.points){assert.ok(p.title&&p.text);if(p.page)assert.ok(p.page>=1&&p.page<=book.pages,`${c.id} point page`);}
    }
  }
});
test('Tao coverage includes every numbered entry once, 001 through 145',()=>{
  const nums=books.find(b=>b.id==='tao').chapters.flatMap(c=>c.points.map(p=>p.title.match(/^(\d{3})\b/)?.[1])).filter(Boolean).map(Number).sort((a,b)=>a-b);
  assert.deepEqual(nums,Array.from({length:145},(_,i)=>i+1));
});
test('content does not contain unfinished placeholders',()=>{
  for(const b of books)assert.doesNotMatch(JSON.stringify(b),/TODO|TBD|LOREM IPSUM|undefined/i);
});
