import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadCatalog, validateCatalog, SHELVES} from '../scripts/catalog.mjs';
const books=await loadCatalog(new URL('../content/',import.meta.url));
test('all sources have valid navigable chapters and in-range source references',()=>{
  const ids=new Set();
  for(const book of books){
    assert.ok(book.title&&book.author&&book.description&&Array.isArray(book.notes));
    assert.ok(book.chapters.length>0);
    for(const c of book.chapters){
      assert.match(c.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.ok(!ids.has(c.id),`duplicate ${c.id}`);ids.add(c.id);
      assert.ok(c.title&&c.part&&c.summary);
      if(book.pages===undefined){assert.equal(c.pages,undefined,`${c.id} page range without book pages`);}
      else{assert.equal(c.pages.length,2);assert.ok(c.pages[0]>=1&&c.pages[0]<=c.pages[1]&&c.pages[1]<=book.pages,`${c.id} page range`);}
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
    const added={id:'new-pdf',shelf:'tech',section:'개발',title:'새 PDF',author:'저자',description:'독립 자료',pages:1,notes:[],order:5,chapters:[{id:'new-pdf-01',title:'새 주제',part:'개요',summary:'새 자료 요약',pages:[1,1],points:[{title:'개념',text:'새 설명'}],practice:[],keywords:[]}]};
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

test('every book sits on a known shelf: original books are Common · 인문, English books are classified separately',()=>{
  assert.deepEqual(SHELVES.map(s=>s.label),['English','Electronic','Tech','Common']);
  for(const book of books.filter(b=>!['grammar','situation-english'].includes(b.id))){assert.equal(book.shelf,'common',book.id);assert.equal(book.section,'인문',book.id);}
  const grammar=books.find(b=>b.id==='grammar');
  assert.equal(grammar.shelf,'english');assert.equal(grammar.section,'Grammar');
  const situation=books.find(b=>b.id==='situation-english');
  assert.equal(situation.shelf,'english');assert.equal(situation.section,'상황별 학습');
  const fixture=structuredClone(books[0]);
  for(const shelf of [undefined,'','humanities']){fixture.shelf=shelf;assert.throws(()=>validateCatalog([fixture]),/shelf must be one of/);}
  fixture.shelf='english';
  for(const section of [undefined,'  ']){fixture.section=section;assert.throws(()=>validateCatalog([fixture]),/section required/);}
});

test('a book without page numbers is valid only when none of its chapters claim page ranges or quotes',()=>{
  const fixture=structuredClone(books.find(b=>b.id==='grammar'));
  assert.equal(fixture.pages,undefined);
  assert.doesNotThrow(()=>validateCatalog([fixture]));
  fixture.chapters[0].pages=[1,1];
  assert.throws(()=>validateCatalog([fixture]),/without pages/);
  delete fixture.chapters[0].pages;fixture.chapters[0].quotes=[{text:'문장',page:1}];
  assert.throws(()=>validateCatalog([fixture]),/without pages/);
});

test('grammar notes use only well-formed, consistent tables',()=>{
  const grammar=books.find(b=>b.id==='grammar');
  const separator=/^\|(\s*:?-{3,}:?\s*\|)+$/;
  const cells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(cell=>cell.trim());
  for(const chapter of grammar.chapters)for(const point of chapter.points){
    const where=`${chapter.id} · ${point.title}`;
    const lines=point.text.split('\n');
    for(let i=0;i<lines.length;){
      if(!lines[i].trim().startsWith('|')){
        assert.ok(!/ \| /.test(lines[i]),`${where}: pipe-separated line outside a table: ${lines[i].trim().slice(0,50)}`);
        assert.ok(!/^\s*-\s*e\.g\.?,?\s*$/i.test(lines[i]),`${where}: leftover e.g. introducer`);
        i++;continue;
      }
      const indent=lines[i].length-lines[i].trimStart().length,rows=[];
      while(i<lines.length&&lines[i].trim().startsWith('|')){
        assert.equal(lines[i].length-lines[i].trimStart().length,indent,`${where}: table rows must share one indentation`);
        assert.ok(lines[i].trim().endsWith('|'),`${where}: table row must end with |`);
        rows.push(lines[i].trim());i++;
      }
      assert.ok(rows.length>=3&&separator.test(rows[1]),`${where}: a table needs a header row, a |---| row and a body row`);
      const head=cells(rows[0]);
      assert.ok(head.every(Boolean),`${where}: empty header cell`);
      for(const [index,row] of rows.entries())if(index!==1)assert.equal(cells(row).length,head.length,`${where}: column count differs in ${row.slice(0,50)}`);
      if(head.includes('예문'))assert.deepEqual(head,['예문','해설'],`${where}: example tables use | 예문 | 해설 |`);
    }
  }
});

test('every situation-based sentence carries a complete study detail, and each broken rule is rejected with its own message',()=>{
  const situation=books.find(b=>b.id==='situation-english');
  const examples=situation.chapters.flatMap(c=>c.examples);
  assert.ok(examples.length>=16);
  for(const example of examples)assert.ok(example.detail,`${example.id} has no detail`);
  const fixture=structuredClone(situation);
  const first=fixture.chapters[0].examples[0];
  assert.doesNotThrow(()=>validateCatalog([fixture]));
  const mutations=[
    ['a section is missing',d=>{delete d.drills},/detail\.drills is required/],
    ['unknown section',d=>{d.extra=[]},/unknown detail section extra/],
    ['usage too short',d=>{d.usage='짧음'},/detail\.usage/],
    ['breakdown no longer reproduces the sentence',d=>{d.breakdown[0][0]='Something else'},/chunks must reproduce the sentence/],
    ['reading has no chunk marks',d=>{d.reading=first.english},/detail\.reading/],
    ['stress word is not in the sentence',d=>{d.stress[0][0]='zebra'},/detail\.stress/],
    ['grammar example is not a bilingual pair',d=>{d.grammarDeep[0].examples[0]=['English only']},/grammarDeep example/],
    ['word with one collocation',d=>{d.words[0].collocations=['only one']},/detail\.words items/],
    ['too many phrases',d=>{d.phrases=Array.from({length:6},()=>structuredClone(d.words[0]))},/at most 5/],
    ['too few tense rows',d=>{d.tenses=d.tenses.slice(0,2)},/detail\.tenses needs/],
    ['alternatives out of order',d=>{d.alternatives.reverse()},/격식, 중립, 구어체/],
    ['pitfall row with an empty cell',d=>{d.pitfalls[0][2]=' '},/detail\.pitfalls rows/],
    ['drill types wrong',d=>{d.drills[0].type='번역'},/빈칸, 변형, 번역/],
    ['blank drill without a blank',d=>{d.drills[0].question='No blank here'},/needs a blank/],
  ];
  for(const [name,mutate,message] of mutations){
    const broken=structuredClone(fixture);mutate(broken.chapters[0].examples[0].detail);
    assert.throws(()=>validateCatalog([broken]),message,name);
  }
  const legacy=structuredClone(fixture);delete legacy.chapters[0].examples[0].detail;
  assert.doesNotThrow(()=>validateCatalog([legacy]),'an example without detail keeps the legacy fields and stays valid');
  delete legacy.chapters[0].examples[0].tenseVariants;
  assert.throws(()=>validateCatalog([legacy]),/without detail needs/);
});
