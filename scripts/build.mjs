import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const books=await Promise.all(['conflict','love','tao'].map(async name=>JSON.parse(await readFile(path.join(root,'content',`${name}.json`),'utf8'))));
const output=path.join(root,'dist');
await mkdir(output,{recursive:true});
const data=`window.LIBRARY = ${JSON.stringify(books).replaceAll('<','\\u003c')};\n`;
await writeFile(path.join(output,'data.js'),data);
for(const file of ['index.html','styles.css','app.js'])await copyFile(path.join(root,'src',file),path.join(output,file));
const [html,css,js]=await Promise.all(['index.html','styles.css','app.js'].map(file=>readFile(path.join(root,'src',file),'utf8')));
const standalone=html.replace('<link rel="stylesheet" href="styles.css">',()=>`<style>${css}</style>`).replace('  <script defer src="data.js"></script>','').replace('  <script defer src="app.js"></script>','').replace('</body>',()=>`<script>${data}</script><script>${js}</script></body>`);
await writeFile(path.join(output,'library.html'),standalone);
console.log(`Built ${books.length} books, ${books.reduce((n,b)=>n+b.chapters.length,0)} chapters into dist/`);
