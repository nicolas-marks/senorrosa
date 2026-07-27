const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('.nav-link');
const body = document.body;

function setMenuOpen(isOpen) {
  siteNav.classList.toggle('is-open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
  body.classList.toggle('nav-open', isOpen);
}

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.contains('is-open');
    setMenuOpen(!isOpen);
  });

  document.addEventListener('click', (event) => {
    const clickedInsideHeader = event.target.closest('.site-header');
    if (!clickedInsideHeader && siteNav.classList.contains('is-open')) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && siteNav.classList.contains('is-open')) {
      setMenuOpen(false);
      navToggle.focus();
    }
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (!link.classList.contains('is-disabled')) {
        setMenuOpen(false);
      }
    });
  });

  siteNav.addEventListener('click', (event) => {
    if (event.target.classList.contains('nav-link') && !event.target.classList.contains('is-disabled')) {
      setMenuOpen(false);
    }
  });
}
