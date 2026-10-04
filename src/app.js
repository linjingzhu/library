(() => {
  'use strict';
  const books = window.LIBRARY;
  const icons = {
    book: '<path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z"/><path d="M12 5v15"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
    link: '<circle cx="5" cy="12" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8 11 7-5M8 13l7 5"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
    file: '<path d="M14 2H5v20h14V7Z"/><path d="M14 2v6h5M8 12h8M8 16h8"/>',
    check: '<path d="m5 12 4 4L20 5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    print: '<path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7Z"/>',
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.book}</svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $ = id => document.getElementById(id);
  const chapters = books.flatMap(book => book.chapters.map(chapter => ({...chapter, book})));
  const validIds = new Set(chapters.map(c => c.id));
  const readStored = key => { try { return JSON.parse(localStorage.getItem(`sayeu:${key}`)); } catch { return null; } };
  const asSet = key => new Set((Array.isArray(readStored(key)) ? readStored(key) : []).filter(x => validIds.has(x)));
  const saved = asSet('saved');
  let recent = (Array.isArray(readStored('recent')) ? readStored('recent') : []).filter(id => validIds.has(id));
  let fontSize = [15,16,17,18,19,20].includes(readStored('font')) ? readStored('font') : 16;
  let route = {type:'home'};
  let toastTimer;
  let storageWarning = false;
  const persist = (key, value) => {
    try { localStorage.setItem(`sayeu:${key}`, JSON.stringify(value)); }
    catch { if (!storageWarning) { storageWarning = true; toast('브라우저 저장이 제한되어 이번 창에서만 유지됩니다.'); } }
  };
  function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => {$('toast').hidden = true;}, 3200); }
  const bookHref = b => `#book/${b.id}`;
  const chapterHref = c => `#read/${c.id}`;
  const category = b => esc(b.category || 'PDF 지식 자료');
  function cover(book, index = books.indexOf(book)) {
    if (book.coverSrc) return `<img class="book-cover cover-image" src="${esc(book.coverSrc)}" alt="${esc(book.title)} 표지" decoding="async">`;
    const title = esc(book.title);
    return `<div class="book-cover ${book.color || 'blue'}" aria-hidden="true"><span class="cover-number">LIBRARY / ${String(index+1).padStart(2,'0')}</span><span class="cover-title">${title}</span><span class="cover-art"></span><span class="cover-sub">READ · THINK · GROW</span></div>`;
  }
  function navItem(hash, label, glyph, active, tail='') { return `<a class="nav-item ${active?'active':''}" href="${hash}" ${active?'aria-current="page"':''}>${icon(glyph)}<span>${label}</span>${tail}</a>`; }
  function navigation() {
    const activeBook = route.book;
    const tabScroll = document.querySelector('.document-tabs')?.scrollTop || 0;
    $('navigation').innerHTML = `<div class="library-tools">${navItem('#home','서재 둘러보기','grid',route.type==='home')}${navItem('#saved','책갈피','bookmark',route.type==='saved',`<span class="count">${saved.size}</span>`)}</div>
      <div class="nav-label">PDF 자료 <span>${books.length}</span></div>
      <div class="document-tabs" role="navigation" aria-label="PDF별 독립 탭">${books.map((b,i)=>`<a class="document-tab ${activeBook?.id===b.id?'active':''}" href="${bookHref(b)}" ${activeBook?.id===b.id?'aria-current="location"':''}><span class="document-number">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(b.title)}</strong><small>${b.chapters.length}개 주제</small></span><span class="book-dot ${b.color || 'blue'}"></span></a>`).join('')}</div>
      ${activeBook?`<div class="toc-heading"><span>이 PDF의 목차</span><a href="${bookHref(activeBook)}">전체 보기 ↗</a></div><div class="document-toc" role="navigation" aria-label="${esc(activeBook.title)} 목차">${activeBook.chapters.map((c,i)=>`${i===0||c.part!==activeBook.chapters[i-1].part?`<div class="toc-part">${esc(c.part)}</div>`:''}<a href="${chapterHref(c)}" ${route.chapter?.id===c.id?'class="active" aria-current="page"':''}><span>${String(i+1).padStart(2,'0')}</span>${esc(c.title)}</a>`).join('')}</div>`:'<p class="tab-guide">PDF를 선택하면 해당 자료의<br>목차와 본문이 열립니다.</p>'}
      <div class="library-secondary">${navItem('#connections','자료 사이의 연결','link',route.type==='connections')}</div>`;
    document.querySelector('.document-tabs').scrollTop = tabScroll;
    for (const selector of ['.document-tabs','.document-toc']) {
      const container=document.querySelector(selector), current=container?.querySelector('.active');
      if(!current)continue;
      const item=current.getBoundingClientRect(), area=container.getBoundingClientRect();
      if(item.top<area.top)container.scrollTop+=item.top-area.top;
      else if(item.bottom>area.bottom)container.scrollTop+=item.bottom-area.bottom;
    }
  }
  function home() {
    const trails = recent.length ? recent.slice(0,3).map(id => chapters.find(c=>c.id===id)) : books.map(b => ({...b.chapters[0],book:b}));
    return `<section class="welcome"><div><div class="eyebrow">A SPACE FOR THOUGHT</div><h1>지식은 연결될 때,<br><em>삶의 문장이 됩니다.</em></h1><p>좋은 관계를 만드는 법부터 나답게 살아가는 태도까지.<br>PDF마다 정리된 생각을, 나의 일상으로 가져오세요.</p></div><div class="welcome-seal" aria-hidden="true">${icon('book')}<small>READ & GROW</small></div></section>
    <div class="stats"><div class="stat"><b>${String(books.length).padStart(2,'0')}</b><span>독립된 PDF 자료</span></div><div class="stat"><b>${chapters.length}</b><span>학습 주제</span></div></div>
    <section aria-labelledby="shelf-title"><div class="section-heading"><h2 id="shelf-title">나의 책장</h2><small>한 권의 생각을 깊이 들여다보기</small></div><div class="shelf">${books.map((b,i)=>`<article class="book-card"><a href="${bookHref(b)}"><div class="book-stage">${cover(b,i)}</div><div class="book-meta"><div class="book-category">${category(b)}</div><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p><div class="book-detail"><span>${b.chapters.length}개 주제</span>${icon('arrow')}</div></div></a></article>`).join('')}</div></section>
    <div class="home-lower"><section class="connection-preview"><div class="tiny-label">IDEAS IN CONNECTION</div><h3>각자의 생각에서,<br>함께 이어지는 질문.</h3><p>우리는 어떻게 서로를 이해하고,<br>더 나은 관계와 삶을 만들어갈 수 있을까요?</p><a class="text-link" href="#connections">책 사이의 연결 발견하기 ${icon('arrow')}</a></section><section class="recent-panel"><h3>${recent.length?'이어서 읽는 생각':'이 질문에서 시작해 보세요'}</h3>${trails.map((c,i)=>`<a class="trail-link" href="${chapterHref(c)}"><span>0${i+1}</span><span>${esc(c.title)}<small>${esc(c.book.title)}</small></span></a>`).join('')}</section></div>`;
  }
  function chapterCard(c,i) {
    return `<a class="chapter-card" href="${chapterHref(c)}"><span class="chapter-index">${String(i+1).padStart(2,'0')}</span><div><h3>${esc(c.title)}</h3><p>${c.points.length}개 핵심 항목</p></div></a>`;
  }
  function bookView(book) {
    const groups = [...new Set(book.chapters.map(c=>c.part || '핵심 내용'))];
    return `<section class="book-hero"><div><div class="eyebrow">${category(book)}</div><h1 class="page-title">${esc(book.title)}</h1><p class="page-lede">${esc(book.description)}</p><div class="chips"><span class="chip">${esc(book.author)}</span><span class="chip">${book.chapters.length}개 학습 주제</span></div><div class="book-toolbar"><a class="primary-button" href="${chapterHref(book.chapters[0])}">${icon('book')} 첫 주제 읽기</a></div></div>${cover(book)}</section><div class="section-heading"><h2>이 책의 지식 구조</h2><small>주제를 선택해 깊이 읽기</small></div>${groups.map(group=>`<section><h2 class="chapter-part">${esc(group)}</h2><div class="chapter-list">${book.chapters.filter(c=>(c.part||'핵심 내용')===group).map(c=>chapterCard(c,book.chapters.indexOf(c))).join('')}</div></section>`).join('')}<p class="note">${book.notes.map(esc).join('<br>')}</p>`;
  }
  function readView(book,c) {
    const index=book.chapters.indexOf(c), previous=book.chapters[index-1],next=book.chapters[index+1];
    const isSaved=saved.has(c.id);
    return `<article class="reading"><div class="reader-topline"><a class="back-link" href="${bookHref(book)}">${icon('back')}책의 전체 구조</a><div class="reader-controls"><button class="icon-button" data-font="-1" aria-label="글자 크기 줄이기" ${fontSize<=15?'disabled':''}>가−</button><button class="icon-button" data-font="1" aria-label="글자 크기 키우기" ${fontSize>=20?'disabled':''}>가+</button><button class="icon-button" data-print aria-label="이 주제 인쇄">${icon('print')}</button><button class="icon-button" data-save="${c.id}" aria-label="${isSaved?'책갈피 해제':'책갈피 저장'}" aria-pressed="${isSaved}">${icon('bookmark')}</button></div></div><div class="eyebrow">${esc(c.part)} · ${String(index+1).padStart(2,'0')} / ${book.chapters.length}</div><h1 class="page-title">${esc(c.title)}</h1><div class="reader-source"><span>${esc(book.title)}</span><span>${c.points.length}개 핵심 항목</span></div><div class="chapter-summary"><small>이 주제에서 얻는 지식</small>${esc(c.summary)}${c.application?`<div class="knowledge-application"><small>판단에 적용하기 · 편집 제안</small><p>${esc(c.application)}</p></div>`:''}</div><section aria-label="핵심 내용">${c.points.map(p=>`<section class="reading-point"><h2>${esc(p.title)}</h2><p>${esc(p.text)}</p></section>`).join('')}</section>${c.practice.length?`<section class="practice"><h2>나의 삶으로 가져오기</h2><small>이 내용을 바탕으로 구성한 실천 질문 · 편집 제안</small><ol>${c.practice.map(p=>`<li>${esc(p)}</li>`).join('')}</ol></section>`:''}<div class="chips">${c.keywords.map(k=>`<button class="chip" data-search="${esc(k)}"># ${esc(k)}</button>`).join('')}</div><div class="prev-next">${previous?`<a href="${chapterHref(previous)}"><small>← 이전 생각</small>${esc(previous.title)}</a>`:'<span></span>'}${next?`<a href="${chapterHref(next)}"><small>다음 생각 →</small>${esc(next.title)}</a>`:`<a href="${bookHref(book)}"><small>책의 구조로 돌아가기 →</small>전체 주제 다시 보기</a>`}</div><p class="note">본문은 원문을 재서술한 요약이며, 스캔본의 문자 인식 오류 가능성이 있습니다. 중요한 표현은 원문과 함께 확인하세요.</p></article>`;
  }
  const connectionThemes = [
    {title:'이해는 판단을 잠시 멈추는 데서 시작된다',text:'상대의 행동에 붙인 이름을 잠시 내려놓으면, 그 뒤의 욕구와 두려움이 보입니다. 세 책을 함께 읽으면 이해는 정답을 판정하는 일이 아니라 상대의 경험을 구체적으로 알아가는 과정이라는 질문으로 이어집니다.',items:[['꿈','갈등 아래의 바람','표면의 쟁점 아래에 있는 가치와 꿈을 묻습니다.'],['언어','내 방식과 상대의 방식','내가 주는 사랑과 상대가 받는 사랑의 차이를 살핍니다.'],['언어','이름이 전부는 아니다','고정된 개념으로 사람과 세상을 단정하는 습관을 돌아봅니다.']]},
    {title:'부드러움은 관계를 지키는 능력이다',text:'대화의 시작, 사랑을 표현하는 말, 강함에 대한 생각은 서로 만납니다. 여기서 부드러움은 내 필요를 숨기는 일이 아니라, 다른 사람을 공격하지 않으면서 표현할 방식을 찾는 것입니다.',items:[['시작','대화의 첫 문장','비난 대신 자신의 감정과 필요한 것을 구체적으로 말합니다.'],['인정','마음을 전하는 말','감사와 격려를 상대가 알아들을 수 있는 말로 건넵니다.'],['부드','유연함의 힘','밀어붙이는 힘보다 유연하게 응답하는 태도를 생각합니다.']]},
    {title:'잠시 멈추면 다른 선택이 보인다',text:'감정에 압도된 순간에는 결론을 서두르기 쉽습니다. 갈등 중의 진정, 사랑을 지속하는 선택, 욕심을 덜어내는 태도를 연결해 지금 무엇이 필요한지 돌아볼 수 있습니다.',items:[['홍수','먼저 몸과 마음 진정하기','대화를 이어갈 수 있는 상태인지 살피고 휴식 뒤 돌아옵니다.'],['선택','감정 이후의 사랑','순간의 감정과 지속해서 실천할 행동을 구분합니다.'],['만족','충분함을 알아차리기','더 얻어야 한다는 조급함 속에서 멈출 지점을 찾습니다.']]},
    {title:'작은 실천이 일상의 방향을 바꾼다',text:'좋은 생각을 아는 것과 생활에서 반복하는 것은 다릅니다. 세 권의 제안을 바탕으로 오늘 가능한 작은 행동을 정하고, 상대의 반응과 자신의 변화를 관찰해 보세요.',items:[['회복','관계를 회복하는 시도','어긋난 순간을 알아차리고 다시 연결을 시도합니다.'],['봉사','돌봄을 행동으로','상대에게 실제로 도움이 되는 일을 확인하고 실행합니다.'],['작','작은 일부터 시작하기','일이 커지기 전에 작은 시작과 꾸준한 주의를 선택합니다.']]},
  ];
  function findConnection(book, term) {
    return book.chapters.find(c=>c.title.includes(term)) || book.chapters.find(c=>c.points.some(p=>(p.title+' '+p.text).includes(term))) || book.chapters[0];
  }
  function connectionsView() {
    return `<div class="eyebrow">IDEAS IN CONNECTION</div><h1 class="page-title">책 사이에서 발견한 연결</h1><p class="page-lede">관계의 기술, 사랑의 표현, 삶의 태도.<br>다른 관점들을 함께 놓고 읽으며 나만의 이해를 만들어 보세요.</p><p class="note">아래 연결은 세 책을 바탕으로 구성한 편집자의 해석입니다. 저자들이 서로의 이론을 직접 지지하거나 동일한 주장을 했다는 뜻은 아닙니다.</p><div class="connections">${connectionThemes.map((t,i)=>`<section class="connection"><div class="tiny-label">CONNECTION 0${i+1}</div><h2>${t.title}</h2><p>${t.text}</p><div class="connection-books">${t.items.map((item,j)=>{const b=books.find(book=>book.id===['conflict','love','tao'][j]);if(!b)return '';const c=findConnection(b,item[0]);return `<a href="${chapterHref(c)}"><span>${esc(b.title)}</span><h3>${item[1]} ↗</h3><p>${item[2]}</p></a>`;}).join('')}</div></section>`).join('')}</div>`;
  }
  function savedView() {
    return `<div class="eyebrow">COLLECTED THOUGHTS</div><h1 class="page-title">다시 꺼내 읽을 생각</h1><p class="page-lede">오래 머물고 싶은 주제를 책갈피에 담아 보세요.<br>이 브라우저에서 저장한 ${saved.size}개의 생각입니다.</p>${saved.size?`<div class="saved-list">${[...saved].reverse().map(id=>{const c=chapters.find(c=>c.id===id);return `<article class="saved-item"><a href="${chapterHref(c)}"><h2>${esc(c.title)}</h2><p>${esc(c.book.title)}</p></a><button class="icon-button" data-save="${c.id}" aria-label="${esc(c.title)} 책갈피 해제" aria-pressed="true">${icon('bookmark')}</button></article>`;}).join('')}</div>`:`<div class="empty-state">${icon('bookmark')}<h2>아직 담아 둔 생각이 없어요</h2><p>주제를 읽다가 오른쪽 위 책갈피를 눌러 보세요.<br>기억하고 싶은 내용을 여기서 다시 만날 수 있습니다.</p><a class="primary-button" href="#home">책장 둘러보기 ${icon('arrow')}</a></div>`}`;
  }
  function resolveRoute() {
    const hash=location.hash.slice(1) || `book/${books[0].id}`;
    const [type,id]=hash.split('/');
    if (type==='book') {const book=books.find(b=>b.id===id);if(book)return {type,book};}
    if(type==='read') {for(const book of books){const chapter=book.chapters.find(c=>c.id===id);if(chapter)return {type,book,chapter};}}
    if(type==='sources'&&!id)return {type:'home'};
    if(['home','saved','connections'].includes(type)&&!id)return {type};
    return {type:'missing'};
  }
  function render(focus=false) {
    route=resolveRoute();
    document.documentElement.style.setProperty('--reading-size',`${fontSize}px`);
    navigation();
    const labels={home:'나의 라이브러리',connections:'연결된 지식',saved:'책갈피',missing:'페이지를 찾을 수 없음'};
    const label=route.book?.title || labels[route.type];
    $('breadcrumb').innerHTML=`<a href="#home">나의 라이브러리</a>${route.type!=='home'?`<span>/</span>${esc(label)}`:''}`;
    document.title=`${route.chapter?.title || label} · 사유의 서재`;
    const views={home,connections:connectionsView,saved:savedView,book:()=>bookView(route.book),read:()=>readView(route.book,route.chapter),missing:()=>`<div class="empty-state"><h1 class="page-title">이 생각을 찾을 수 없어요</h1><p>주소가 바뀌었거나 올바르지 않습니다. 책장에서 다시 찾아보세요.</p><a class="primary-button" href="#home">책장으로 돌아가기</a></div>`};
    $('main').innerHTML=views[route.type]();
    if(route.chapter){recent=[route.chapter.id,...recent.filter(x=>x!==route.chapter.id)].slice(0,10);persist('recent',recent);}
    if(focus){window.scrollTo(0,0);$('main').focus({preventScroll:true});}
  }
  function toggleMenu(open, restore=true) {
    $('sidebar').classList.toggle('open',open);$('scrim').hidden=!open;$('menu-toggle').setAttribute('aria-expanded',String(open));
    $('sidebar').inert=window.matchMedia('(max-width:850px)').matches&&!open;
    $('menu-toggle').setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');
    document.body.style.overflow=open?'hidden':'';
    document.querySelector('.workspace').inert=open;
    if(open)$('sidebar').querySelector('a').focus();else if(restore)$('menu-toggle').focus();
  }
  function showSearch(query=$('search-input').value) {
    toggleMenu(false,false);
    $('search-input').value=query;
    $('search-panel').hidden=false;
    search(query);
    $('search-input').focus();
  }
  function hideSearch(restore=false) {
    if(restore)$('search-input').focus();
    $('search-panel').hidden=true;
  }
  const normalize=s=>s.toLocaleLowerCase('ko').normalize('NFKC');
  const searchIndex = [
    ...chapters.map(c=>({title:c.title,source:`${c.book.title}`,href:chapterHref(c),text:[c.title,c.book.title,c.book.author,c.part,c.summary,c.application || '',...c.points.map(p=>p.title+' '+p.text),...c.practice,...c.keywords].join(' ')})),
    ...books.map(b=>({title:b.title,source:'자료 소개 · '+b.author,href:bookHref(b),text:[b.title,b.author,b.subtitle,b.description,b.category].filter(Boolean).join(' ')})),
    ...books.map(b=>({title:`${b.title} · 출처 안내`,source:'자료 출처',href:bookHref(b),text:[b.title,b.author,...b.notes].join(' ')})),
    ...connectionThemes.map(t=>({title:t.title,source:'자료 사이의 연결 · 편집 해석',href:'#connections',text:[t.title,t.text,...t.items.flat()].join(' ')})),
  ].map(entry=>({...entry,normalized:normalize(entry.text)}));
  function highlight(text, query) {
    const escaped=esc(text); if(!query)return escaped;
    const regex=new RegExp(esc(query).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
    return escaped.replace(regex,match=>`<mark>${match}</mark>`);
  }
  function search(value) {
    const query=value.trim(),q=normalize(query);
    if(!q){$('search-results').innerHTML='<p class="search-count">어떤 생각을 찾고 있나요?</p><div class="chips">'+['갈등','인정','사랑','무위','회복','언어'].map(k=>`<button class="chip" data-search="${k}">${k}</button>`).join('')+'</div>';return;}
    const results=searchIndex.filter(entry=>entry.normalized.includes(q));
    $('search-results').innerHTML=`<p class="search-count">${results.length}개의 검색 결과${results.length>80?' · 앞의 80개 표시':''}</p>`+(results.length?results.slice(0,80).map(({title,source,href,text,normalized})=>{const index=normalized.indexOf(q),start=Math.max(0,index-35),snippet=(start?'…':'')+text.slice(start,start+150)+(text.length>start+150?'…':'');return `<a class="search-result" href="${href}"><small>${esc(source)}</small><h3>${highlight(title,query)}</h3><p>${highlight(snippet,query)}</p></a>`;}).join(''):'<div class="empty-state"><h2>일치하는 생각이 없어요</h2><p>짧은 단어나 다른 표현으로 찾아보세요.<br>예: 사랑, 대화, 무위</p></div>');
  }
  document.addEventListener('click',event=>{
    if(!event.target.closest('#header-search'))hideSearch();
    const target=event.target.closest('button,a');if(!target)return;
    if(target.classList.contains('skip')){event.preventDefault();$('main').focus();return;}
    if(target.dataset.search!==undefined){showSearch(target.dataset.search);return;}
    if(target.dataset.save){const id=target.dataset.save,wasSaved=saved.has(id);wasSaved?saved.delete(id):saved.add(id);persist('saved',[...saved]);const scroll=window.scrollY;render();window.scrollTo(0,scroll);const replacement=document.querySelector(`[data-save="${id}"]`);if(replacement)replacement.focus({preventScroll:true});else $('main').focus({preventScroll:true});toast(wasSaved?'책갈피를 해제했습니다.':'책갈피에 생각을 담았습니다.');return;}
    if(target.dataset.font){fontSize=Math.max(15,Math.min(20,fontSize+Number(target.dataset.font)));persist('font',fontSize);document.documentElement.style.setProperty('--reading-size',`${fontSize}px`);document.querySelector('[data-font="-1"]').disabled=fontSize<=15;document.querySelector('[data-font="1"]').disabled=fontSize>=20;return;}
    if(target.hasAttribute('data-print')){window.print();return;}
    if(target.matches('a[href^="#"]')){hideSearch();if($('sidebar').classList.contains('open'))toggleMenu(false,false);if(target.hash===location.hash)$('main').focus();}
  });
  $('menu-toggle').innerHTML=icon('menu');$('search-icon').innerHTML=icon('search');
  $('menu-toggle').addEventListener('click',()=>{hideSearch();toggleMenu(!$('sidebar').classList.contains('open'));});
  $('scrim').addEventListener('click',()=>toggleMenu(false));
  $('search-form').addEventListener('submit',event=>{event.preventDefault();showSearch();});
  $('search-input').addEventListener('focus',()=>{$('search-panel').hidden=false;search($('search-input').value);});
  $('search-input').addEventListener('input',event=>{$('search-panel').hidden=false;search(event.target.value);});
  $('search-input').addEventListener('click',()=>{$('search-panel').hidden=false;search($('search-input').value);});
  $('search-close').addEventListener('click',()=>hideSearch(true));
  $('header-search').addEventListener('focusout',event=>{if(!event.relatedTarget||!$('header-search').contains(event.relatedTarget))hideSearch();});
  window.addEventListener('hashchange',()=>{hideSearch();render(true);});
  document.addEventListener('keydown',event=>{
    if(event.isComposing)return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();showSearch();}
    if(event.key==='Escape'&&!$('search-panel').hidden){event.preventDefault();hideSearch(true);}
    if(event.key==='Escape'&&$('sidebar').classList.contains('open')){event.preventDefault();toggleMenu(false);}
    if(event.key==='Tab'&&$('sidebar').classList.contains('open')){const links=[...$('sidebar').querySelectorAll('a')],first=links[0],last=links.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  });
  window.matchMedia('(min-width:851px)').addEventListener('change',()=>toggleMenu(false,false));
  render();
  toggleMenu(false,false);
})();
