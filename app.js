(() => {
  const chapters = [...document.querySelectorAll('.chapter')];
  const links = [...document.querySelectorAll('.toc a')];
  const key = 'wordpress-guide-progress-v1';
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
  if (!Array.isArray(saved)) saved = [];
  const marks = [...document.querySelectorAll('.complete input')];
  function progress() {
    const done = marks.filter(i => i.checked).map(i => i.dataset.chapter);
    try { localStorage.setItem(key, JSON.stringify(done)); } catch {}
    document.querySelector('#progress-label').textContent = `${done.length} из ${marks.length} этапов изучено`;
    document.querySelector('.progress-fill').style.width = `${done.length / marks.length * 100}%`;
    links.forEach(a => a.classList.toggle('done', done.includes(a.hash.slice(1))));
  }
  marks.forEach(input => {input.checked = saved.includes(input.dataset.chapter);input.addEventListener('change', progress);});
  progress();
  document.querySelector('#reset').addEventListener('click', () => {marks.forEach(i => i.checked = false);progress();});
  document.querySelectorAll('[data-set-mode]').forEach(button => button.addEventListener('click', () => {
    document.body.dataset.mode = button.dataset.setMode;
    document.querySelectorAll('[data-set-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  }));
  const sidebar = document.querySelector('.sidebar');
  const menu = document.querySelector('.menu-button');
  function closeMenu() {sidebar.classList.remove('open');menu.setAttribute('aria-expanded', 'false');}
  menu.addEventListener('click', () => {const open = sidebar.classList.toggle('open');menu.setAttribute('aria-expanded', String(open));});
  document.addEventListener('keydown', e => {if (e.key === 'Escape') closeMenu();});
  document.addEventListener('click', e => {if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !menu.contains(e.target)) closeMenu();});
  const search = document.querySelector('#search');
  function filter() {
    const q = search.value.trim().toLocaleLowerCase('ru');
    let count = 0;
    chapters.forEach(ch => {const show = !q || ch.textContent.toLocaleLowerCase('ru').includes(q);ch.hidden = !show;count += show ? 1 : 0;});
    links.forEach(a => a.hidden = document.querySelector(a.hash).hidden);
    document.querySelector('#search-status').textContent = q ? `Найдено глав: ${count}` : '';
    document.querySelector('.empty').style.display = count ? 'none' : 'block';
  }
  search.addEventListener('input', filter);
  links.forEach(a => a.addEventListener('click', () => {search.value='';filter();closeMenu();}));
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) links.forEach(a => a.classList.toggle('active', a.hash === '#' + entry.target.id));
  }, {rootMargin:'-15% 0px -65% 0px'});
  chapters.forEach(ch => observer.observe(ch));
  document.querySelectorAll('.code-box').forEach(box => {
    const button = document.createElement('button');button.className='copy-code';button.textContent='Копировать';
    button.addEventListener('click', async () => {try {await navigator.clipboard.writeText(box.querySelector('code').textContent);button.textContent='Скопировано';}catch{button.textContent='Выделите код вручную';}setTimeout(() => button.textContent='Копировать',2000);});
    box.append(button);
  });
  document.querySelector('#check-quiz').addEventListener('click', () => {
    let correct=0, answered=0;
    document.querySelectorAll('.quiz-item').forEach(item => {
      const choice=item.querySelector('input:checked');
      const good=choice?.value === item.dataset.answer;
      if(choice) answered++;if(good) correct++;
      item.classList.add('checked');item.classList.toggle('correct',good);item.classList.toggle('incorrect',!good);
    });
    document.querySelector('#quiz-result').textContent=`Правильных ответов: ${correct} из 8. Отвечено: ${answered}. Объяснения появились под вопросами.`;
  });
})();
