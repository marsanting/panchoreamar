document.documentElement.classList.add('js');
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const themeToggle = document.querySelector('.theme-toggle');
const savedTheme = localStorage.getItem('reamar-theme');
if (savedTheme === 'dark') document.body.dataset.theme = 'dark';
const updateThemeToggle = () => {
  const dark = document.body.dataset.theme === 'dark';
  if (!themeToggle) return;
  themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
};
updateThemeToggle();
themeToggle?.addEventListener('click', () => {
  const dark = document.body.dataset.theme !== 'dark';
  document.body.dataset.theme = dark ? 'dark' : 'light';
  localStorage.setItem('reamar-theme', dark ? 'dark' : 'light');
  updateThemeToggle();
});

const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-link, .mobile-nav a').forEach((link) => {
  const isCurrent = link.getAttribute('href') === currentPage;
  link.classList.toggle('active', isCurrent);
  if (isCurrent) link.setAttribute('aria-current', 'page');
  else link.removeAttribute('aria-current');
});

const galleryDialog = document.querySelector('.gallery-dialog');
if (galleryDialog) {
  const galleryTitle = galleryDialog.querySelector('#gallery-title');
  const galleryClose = galleryDialog.querySelector('.gallery-close');
  const galleryViews = galleryDialog.querySelectorAll('[data-gallery-view]');
  document.querySelectorAll('[data-gallery]').forEach((card) => {
    card.addEventListener('click', () => {
      const gallery = card.dataset.gallery;
      galleryViews.forEach((view) => { view.hidden = view.dataset.galleryView !== gallery; });
      galleryTitle.textContent = gallery === 'projects' ? 'Project Samples' : 'Client/Customer Experience';
      galleryDialog.showModal();
      galleryClose.focus();
    });
  });
  galleryClose.addEventListener('click', () => galleryDialog.close());
  galleryDialog.addEventListener('click', (event) => {
    if (event.target === galleryDialog) galleryDialog.close();
  });
}


/* Decorative spring-follow cursor adapted from cursor.txt. */
(() => {
  if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dot = document.createElement('div');
  dot.className = 'custom-cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);

  const hoverTargets = 'a, button, input, textarea, select, summary, [role="button"], [tabindex]:not([tabindex="-1"])';
  let targetX = 0;
  let targetY = 0;
  let positionX = 0;
  let positionY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let lastTime = 0;
  let animationFrame = 0;

  const animate = (time) => {
    const delta = Math.min((time - (lastTime || time)) / 1000, 0.032);
    lastTime = time;
    const stiffness = 150;
    const damping = 22;
    const mass = 0.8;
    const accelerationX = (stiffness * (targetX - positionX) - damping * velocityX) / mass;
    const accelerationY = (stiffness * (targetY - positionY) - damping * velocityY) / mass;
    velocityX += accelerationX * delta;
    velocityY += accelerationY * delta;
    positionX += velocityX * delta;
    positionY += velocityY * delta;
    dot.style.transform = `translate3d(${positionX}px,${positionY}px,0) translate(-50%,-50%)`;

    if (Math.abs(targetX - positionX) > 0.1 || Math.abs(targetY - positionY) > 0.1 || Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      animationFrame = 0;
    }
  };

  document.addEventListener('pointermove', (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    dot.style.opacity = '1';
    if (!animationFrame) animationFrame = requestAnimationFrame(animate);
  }, { passive: true });

  document.addEventListener('pointerover', (event) => {
    if (event.target instanceof Element && event.target.closest(hoverTargets)) dot.dataset.hover = 'true';
  });

  document.addEventListener('pointerout', (event) => {
    const fromTarget = event.target instanceof Element && event.target.closest(hoverTargets);
    const toTarget = event.relatedTarget instanceof Element && event.relatedTarget.closest(hoverTargets);
    if (fromTarget && !toTarget) delete dot.dataset.hover;
    if (!event.relatedTarget) dot.style.opacity = '0';
  });
})();
