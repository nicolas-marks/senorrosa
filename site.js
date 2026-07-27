document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('#mobile-nav-toggle');
  const siteNav = document.querySelector('#site-nav');
  const navLinks = document.querySelectorAll('.nav-link');
  const body = document.body;

  if (!navToggle || !siteNav) {
    return;
  }

  console.log('mobile menu clicked');

  function setMenuOpen(isOpen) {
    siteNav.classList.toggle('is-open', isOpen);
    navToggle.classList.toggle('is-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    body.classList.toggle('nav-open', isOpen);
    siteNav.style.display = isOpen ? 'flex' : '';
    siteNav.style.visibility = isOpen ? 'visible' : 'hidden';
    siteNav.style.opacity = isOpen ? '1' : '0';
    siteNav.style.pointerEvents = isOpen ? 'auto' : 'none';
    siteNav.style.zIndex = isOpen ? '60' : '';
  }

  navToggle.addEventListener('click', () => {
    console.log('mobile menu clicked');
    const isOpen = siteNav.classList.contains('is-open');
    setMenuOpen(!isOpen);
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (!link.classList.contains('is-disabled')) {
        setMenuOpen(false);
      }
    });
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

  setMenuOpen(false);
});
