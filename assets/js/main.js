// ============ Footer year ============
document.getElementById('year').textContent = new Date().getFullYear();

// ============ Header solid-on-scroll ============
const header = document.getElementById('siteHeader');
function updateHeader(){
  if(window.scrollY > 40){ header.classList.add('solid'); }
  else{ header.classList.remove('solid'); }
}
updateHeader();
window.addEventListener('scroll', updateHeader, { passive:true });

// ============ Mobile nav toggle ============
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
navToggle.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
});
mainNav.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mainNav.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  });
});

// ============ Hero slider ============
const slides = Array.from(document.querySelectorAll('.hero-slide'));
const texts = Array.from(document.querySelectorAll('.hero-text'));
const dots = Array.from(document.querySelectorAll('.hero-dot'));
let current = 0;
let autoplayTimer = null;
const AUTOPLAY_MS = 7000;

function goTo(index){
  if(index === current) return;
  slides[current].classList.remove('active');
  texts[current].classList.remove('visible');
  texts[current].hidden = true;
  dots[current].classList.remove('active');
  dots[current].removeAttribute('aria-current');

  current = index;

  slides[current].classList.add('active');
  dots[current].classList.add('active');
  dots[current].setAttribute('aria-current','true');
  texts[current].hidden = false;
  header.classList.toggle('on-light', slides[current].dataset.theme === 'light');
  // trigger transition on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => texts[current].classList.add('visible'));
  });
}

function nextSlide(){
  goTo((current + 1) % slides.length);
}

function restartAutoplay(){
  if(autoplayTimer) clearInterval(autoplayTimer);
  autoplayTimer = setInterval(nextSlide, AUTOPLAY_MS);
}

dots.forEach(dot => {
  dot.addEventListener('click', () => {
    goTo(parseInt(dot.dataset.goto, 10));
    restartAutoplay();
  });
});

const heroEl = document.getElementById('top');
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  restartAutoplay();
  heroEl.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
  heroEl.addEventListener('mouseleave', restartAutoplay);
  heroEl.addEventListener('focusin', () => clearInterval(autoplayTimer));
  heroEl.addEventListener('focusout', restartAutoplay);
}
