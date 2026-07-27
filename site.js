const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const navItems = document.querySelectorAll('.nav-item');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

navItems.forEach((item) => {
  const trigger = item.querySelector('.nav-trigger');

  if (!trigger) {
    return;
  }

  trigger.addEventListener('click', () => {
    const isOpen = item.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(isOpen));

    navItems.forEach((otherItem) => {
      if (otherItem !== item) {
        otherItem.classList.remove('is-open');
        const otherTrigger = otherItem.querySelector('.nav-trigger');
        if (otherTrigger) {
          otherTrigger.setAttribute('aria-expanded', 'false');
        }
      }
    });
  });
});

document.querySelectorAll('.dropdown-link.is-disabled').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
  });
});
