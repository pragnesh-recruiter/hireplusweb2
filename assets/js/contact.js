// ============ Contact popup ============
(function () {
  const modal   = document.getElementById('contactModal');
  if (!modal) return;

  const dialog  = modal.querySelector('.modal-dialog');
  const form    = document.getElementById('contactForm');
  const formWrap = document.getElementById('contactFormWrap');
  const success = document.getElementById('formSuccess');
  const statusEl = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');
  const country = document.getElementById('cf-country');
  const service = document.getElementById('cf-service');

  // Where the form posts to (relative to index.html). Change if the PHP file lives elsewhere.
  const ENDPOINT = form.getAttribute('action') || 'send-mail.php';
  const FALLBACK_EMAIL = 'hr@hireplustech.com';

  // ---------- country list ----------
  const COUNTRIES = ['Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo (Republic)','Congo (DR)','Costa Rica','Côte d’Ivoire','Croatia','Cuba','Cyprus','Czechia','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Macao','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Puerto Rico','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','São Tomé and Príncipe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Türkiye','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe','Other'];
  COUNTRIES.forEach(name => {
    const o = document.createElement('option');
    o.value = o.textContent = name;
    country.appendChild(o);
  });

  // ---------- open / close ----------
  let lastFocus = null;
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function resetView() {
    formWrap.hidden = false;
    success.hidden = true;
    setStatus('');
  }

  function openModal(preselect) {
    lastFocus = document.activeElement;
    resetView();
    if (preselect) {
      const match = Array.from(service.options).find(o => o.value === preselect);
      if (match) service.value = preselect;
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    // let the browser paint before focusing so the scroll position is right
    requestAnimationFrame(() => document.getElementById('cf-first').focus({ preventScroll: true }));
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  document.querySelectorAll('[data-open-contact]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      // close the mobile menu if it was open
      const nav = document.getElementById('mainNav');
      const toggle = document.getElementById('navToggle');
      if (nav) nav.classList.remove('open');
      if (toggle) { toggle.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
      openModal(el.dataset.service);
    });
  });

  modal.querySelectorAll('[data-close-contact]').forEach(el => el.addEventListener('click', closeModal));
  modal.addEventListener('mousedown', e => { if (e.target === modal) closeModal(); });

  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {                       // keep focus inside the dialog
      const items = Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------- validation ----------
  const RULES = {
    first_name: v => v ? '' : 'Please enter your first name.',
    last_name:  v => v ? '' : 'Please enter your last name.',
    country:    v => v ? '' : 'Please select your country.',
    phone: v => {
      if (!v) return 'Please enter your phone number.';
      const digits = v.replace(/\D/g, '');
      return (/^[0-9+()\-.\s]+$/.test(v) && digits.length >= 7 && digits.length <= 15) ? '' : 'Please enter a valid phone number.';
    },
    email: v => {
      if (!v) return 'Please enter your email address.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Please enter a valid email address.';
    },
    service: v => v ? '' : 'Please choose a service.',
    message: v => {
      if (!v) return 'Please tell us how we can help.';
      return v.length >= 10 ? '' : 'Please tell us a little more (at least 10 characters).';
    }
  };

  function showError(name, msg) {
    const input = form.elements[name];
    const slot = form.querySelector('[data-err="' + name + '"]');
    if (!input || !slot) return;
    slot.textContent = msg;
    input.classList.toggle('invalid', !!msg);
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  function validateField(name) {
    if (!RULES[name]) return true;
    const msg = RULES[name](form.elements[name].value.trim());
    showError(name, msg);
    return !msg;
  }

  Object.keys(RULES).forEach(name => {
    const el = form.elements[name];
    el.addEventListener('blur', () => validateField(name));
    el.addEventListener('input', () => { if (el.classList.contains('invalid')) validateField(name); });
    el.addEventListener('change', () => { if (el.classList.contains('invalid')) validateField(name); });
  });

  function setStatus(msg, html) {
    statusEl.hidden = !msg;
    if (html) statusEl.innerHTML = msg; else statusEl.textContent = msg;
  }

  // Clicking Send shouldn't blur the current field first: its error message would push the
  // button down and the click would miss. Keep focus where it is; submit validates everything.
  submitBtn.addEventListener('mousedown', e => e.preventDefault());

  // ---------- submit ----------
  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus('');

    let firstBad = null;
    Object.keys(RULES).forEach(name => {
      if (!validateField(name) && !firstBad) firstBad = form.elements[name];
    });
    if (firstBad) { firstBad.focus(); return; }

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      let data = null;
      try { data = await res.json(); } catch (_) { /* non-JSON response (e.g. PHP not running) */ }

      if (res.ok && data && data.ok) {
        document.getElementById('successName').textContent = ', ' + form.elements.first_name.value.trim();
        form.reset();
        formWrap.hidden = true;
        success.hidden = false;
        success.focus();
        return;
      }

      if (data && data.errors) {                       // server-side validation messages
        let focused = false;
        Object.keys(data.errors).forEach(name => {
          showError(name, data.errors[name]);
          if (!focused && form.elements[name]) { form.elements[name].focus(); focused = true; }
        });
        return;
      }
      throw new Error((data && data.message) || 'send-failed');
    } catch (err) {
      const msg = (err && err.message && err.message !== 'send-failed' && err.message !== 'Failed to fetch')
        ? err.message
        : 'Sorry, we couldn’t send your message just now.';
      setStatus(msg + ' Please try again, or email us at <a href="mailto:' + FALLBACK_EMAIL + '">' + FALLBACK_EMAIL + '</a>.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });
})();
