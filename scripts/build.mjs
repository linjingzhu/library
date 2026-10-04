import {readFile,writeFile,mkdir,copyFile,open} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {loadCatalog} from './catalog.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const books=await loadCatalog(path.join(root,'content'));
for (const book of books) {
  if (!book.coverImage) continue;
  const bytes=await readFile(path.join(root,'assets','covers',book.coverImage));
  const extension=path.extname(book.coverImage).slice(1);
  const mime=extension==='jpg'?'jpeg':extension;
  book.coverSrc=`data:image/${mime};base64,${bytes.toString('base64')}`;
}
const output=path.join(root,'dist');
await mkdir(output,{recursive:true});
for (const book of books) {
  if (!book.sourcePdf) continue;
  const source=path.join(root,'sources','pdfs',book.sourcePdf);
  const file=await open(source,'r');
  try {
    const header=Buffer.alloc(5);
    await file.read(header,0,5,0);
    if (header.toString()!=='%PDF-') throw new Error(`${book.id}: sourcePdf is not a PDF`);
  } finally { await file.close(); }
  await mkdir(path.join(output,'sources','pdfs'),{recursive:true});
  await copyFile(source,path.join(output,'sources','pdfs',book.sourcePdf));
}
const data=`window.LIBRARY = ${JSON.stringify(books).replaceAll('<','\\u003c')};\n`;
await writeFile(path.join(output,'data.js'),data);
for(const file of ['index.html','styles.css','app.js'])await copyFile(path.join(root,'src',file),path.join(output,file));
const [html,css,js]=await Promise.all(['index.html','styles.css','app.js'].map(file=>readFile(path.join(root,'src',file),'utf8')));
const standalone=html.replace('<link rel="stylesheet" href="styles.css">',()=>`<style>${css}</style>`).replace('  <script defer src="data.js"></script>','').replace('  <script defer src="app.js"></script>','').replace('</body>',()=>`<script>${data}</script><script>${js}</script></body>`);
await writeFile(path.join(output,'library.html'),standalone);
if(process.argv.includes('--pages')) {
  await writeFile(path.join(root,'index.html'),standalone);
  await writeFile(path.join(root,'.nojekyll'),'');
}
console.log(`Built ${books.length} books, ${books.reduce((n,b)=>n+b.chapters.length,0)} chapters into dist/`);
