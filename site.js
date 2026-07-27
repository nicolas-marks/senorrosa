"use strict";

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".nav-link");

function closeMobileMenu() {
  if (!navToggle || !siteNav) {
    return;
  }

  siteNav.classList.remove("is-open");
  document.body.classList.remove("nav-open");
  navToggle.setAttribute("aria-expanded", "false");
}

function toggleMobileMenu() {
  if (!navToggle || !siteNav) {
    return;
  }

  const isOpen = siteNav.classList.toggle("is-open");

  document.body.classList.toggle("nav-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
}

if (navToggle && siteNav) {
  navToggle.addEventListener("click", toggleMobileMenu);

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (!link.classList.contains("is-disabled")) {
        closeMobileMenu();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileMenu();
      navToggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 520) {
      closeMobileMenu();
    }
  });
}