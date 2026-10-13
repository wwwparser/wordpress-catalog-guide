document.querySelector('.menu-toggle')?.addEventListener('click', event => {
  const button = event.currentTarget;
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  document.querySelector('#main-nav')?.classList.toggle('is-open', !expanded);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  document.querySelector('.catalog-menu')?.removeAttribute('open');
  document.querySelector('#main-nav')?.classList.remove('is-open');
  document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
});
if (document.body.classList.contains('home') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const logo = document.querySelector('.logo img');
  if (logo) {
    const preloader = document.createElement('div');
    preloader.className = 'cerlab-preloader';
    preloader.setAttribute('aria-hidden', 'true');
    preloader.append(logo.cloneNode(true));
    document.body.append(preloader);
    setTimeout(() => preloader.remove(), 800);
  }
}
