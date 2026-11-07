(function () {
  'use strict';
  const container = document.getElementById('managed-work-grid');
  const section = document.getElementById('managed-work-section');
  if (!container || !section) return;
  const fa = document.documentElement.lang === 'fa';
  const fallback = '/assets/roznex-studio-editorial.svg';
  const staticTitles = new Set(Array.from(document.querySelectorAll('.work-grid h2')).map(el => el.textContent.trim().toLocaleLowerCase()));
  function safeUrl(value) {
    try {
      const url = new URL(String(value || ''), window.location.origin);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }
  function text(tag, value, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = String(value || '');
    return el;
  }
  function card(project) {
    const item = document.createElement('article');
    item.className = 'work-card';
    const img = document.createElement('img');
    img.src = project.imageUrl && project.imageUrl.startsWith('/api/project-image?') ? project.imageUrl : fallback;
    img.alt = (fa ? 'تصویر پروژه ' : 'Project preview: ') + project.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => { if (!img.src.endsWith(fallback)) img.src = fallback; }, { once: true });
    const body = text('div', '', 'work-body');
    body.append(text('span', project.category || (fa ? 'نمونه‌کار' : 'PROJECT')));
    body.append(text('h2', project.title));
    if (project.summary) body.append(text('p', project.summary));
    body.append(text('small', fa ? 'پروژه منتشرشده' : 'Published project', 'work-state published'));
    const url = safeUrl(project.url);
    if (url) {
      const link = text('a', fa ? 'مشاهده پروژه ←' : 'View project →');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      body.append(link);
    }
    item.append(img, body);
    return item;
  }
  fetch('/api/projects', { credentials: 'omit', cache: 'no-store' })
    .then(async response => {
      if (!response.ok) throw new Error('projects_api_unavailable');
      return response.json();
    })
    .then(data => {
      if (!data.storageReady || !Array.isArray(data.projects)) return;
      const projects = data.projects.filter(p => p && typeof p.title === 'string' && p.title.trim() &&
        !staticTitles.has(p.title.trim().toLocaleLowerCase()));
      if (!projects.length) return;
      const fragment = document.createDocumentFragment();
      projects.forEach(p => fragment.append(card(p)));
      container.append(fragment);
      section.hidden = false;
    })
    .catch(() => {
      // Keep the existing static case studies visible when the API is unavailable.
    });
})();