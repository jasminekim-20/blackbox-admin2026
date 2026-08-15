const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.site-nav');
const header = document.querySelector('.site-header');
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const sections = [...document.querySelectorAll('main section[id]')];
const darkSections = [...document.querySelectorAll('.dark-section')];
const projectFilterButtons = [...document.querySelectorAll('.tabs [data-generation]')];
const projectCards = [...document.querySelectorAll('.project-card[data-generation]')];
const projectGroups = [...document.querySelectorAll('.project-group')];
const projectEmpty = document.querySelector('.project-empty');
const revealTargets = [
  ...document.querySelectorAll([
    '.section-heading',
    '.about-copy',
    '.blackbox-diagram',
    '.tabs',
    '.project-rows',
    '.journal-heading',
    '.timeline-item',
    '.schedule-block',
    '.event-block',
    '.recruit-cta'
  ].join(','))
].filter(target => {
  if (target.classList.contains('section-heading') && target.closest('#join')) return false;
  if (target.classList.contains('members-heading')) return false;
  return true;
});

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
});

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    const id = link.getAttribute('href')?.slice(1);
    if (id) setActiveLink(id);
  });
});

const setActiveLink = id => {
  navLinks.forEach(link => {
    link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
  });
};

const setHeaderTheme = () => {
  if (!header) return;
  const probe = window.scrollY + header.offsetHeight + 80;
  const isDark = darkSections.some(section => {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;
    return probe >= top && probe < bottom;
  });
  header.classList.toggle('is-on-hero', isDark);
};

const syncActiveSection = () => {
  const probe = window.scrollY + (header?.offsetHeight || 0) + 96;
  const current = sections
    .filter(section => section.offsetTop <= probe)
    .sort((a, b) => b.offsetTop - a.offsetTop)[0] || sections[0];
  if (current) setActiveLink(current.id);
};

revealTargets.forEach((target, index) => {
  target.classList.add('scroll-reveal');
  if (target.classList.contains('timeline-item')) {
    target.dataset.reveal = target.classList.contains('left') ? 'slide-left' : 'slide-right';
  } else if (target.classList.contains('project-rows')) {
    target.dataset.reveal = 'scale';
  }
  target.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 45}ms`);
});

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

revealTargets.forEach(target => revealObserver.observe(target));
setActiveLink('home');
setHeaderTheme();
syncActiveSection();
window.addEventListener('scroll', () => {
  setHeaderTheme();
  syncActiveSection();
}, { passive: true });
window.addEventListener('resize', () => {
  setHeaderTheme();
  syncActiveSection();
});

const setProjectFilter = generation => {
  projectFilterButtons.forEach(button => {
    button.classList.toggle('is-active', button.dataset.generation === generation);
  });

  let visibleCount = 0;
  projectCards.forEach(card => {
    const visible = card.dataset.generation === generation;
    card.classList.toggle('is-filtered-out', !visible);
    if (visible) visibleCount += 1;
  });

  projectGroups.forEach(group => {
    const hasVisibleCard = [...group.querySelectorAll('.project-card')].some(card => !card.classList.contains('is-filtered-out'));
    group.classList.toggle('is-empty', !hasVisibleCard);
  });

  if (projectEmpty) projectEmpty.hidden = visibleCount > 0;
};

projectFilterButtons.forEach(button => {
  button.addEventListener('click', () => setProjectFilter(button.dataset.generation));
});

setProjectFilter(projectFilterButtons.find(button => button.classList.contains('is-active'))?.dataset.generation || '32');
