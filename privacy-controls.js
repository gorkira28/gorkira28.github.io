(() => {
  'use strict';
  const config = window.PORTFOLIO_CONFIG || {};
  const id = /^G-[A-Z0-9]+$/.test(config.measurementId || '') ? config.measurementId : '';
  const key = 'kg-analytics-consent-v1';
  const sessionKey = key + '-session-rejection';
  const ttl = 180 * 86400000;
  const dialog = document.getElementById('privacy-choices');
  const status = document.getElementById('privacy-status');
  const saveWarning = document.getElementById('privacy-save-warning');
  let enabled = false;
  let loaded = false;
  let unsavedRejection = false;
  let opener = null;
  let observer;
  const timers = new Map();
  const seen = new Set();
  const actions = new Set(['publication_jia_mental_health','publication_jia_screening','publication_asthma_jia','project_atlas_repository','project_atlas_methodology','project_atlas_image','project_neha_award','linkedin_profile','contact_email','contact_gmail','contact_copy_email','contact_phone']);
  const sections = new Set(['home','work','research','perspective','experience','evidence','contact']);
  const page = location.pathname.endsWith('/privacy.html') ? 'privacy' : 'portfolio';
  // Deliberately fixed: never send query strings, fragments, or document titles.
  const cleanLocation = 'https://gorkira28.github.io/' + (page === 'privacy' ? 'privacy.html' : '');
  const referralOrigins = new Map([
    ['linkedin.com', 'https://www.linkedin.com/'],
    ['www.linkedin.com', 'https://www.linkedin.com/'],
    ['m.linkedin.com', 'https://www.linkedin.com/'],
    ['google.com', 'https://www.google.com/'],
    ['www.google.com', 'https://www.google.com/'],
    ['news.google.com', 'https://www.google.com/'],
    ['bing.com', 'https://www.bing.com/'],
    ['www.bing.com', 'https://www.bing.com/'],
    ['github.com', 'https://github.com/'],
    ['www.github.com', 'https://github.com/'],
    ['substack.com', 'https://substack.com/'],
    ['www.substack.com', 'https://substack.com/']
  ]);
  // Inspect the host locally; return only a constant origin from this exact list.
  const safeReferrer = (() => {
    try {
      const referrer = new URL(document.referrer);
      if (!['https:', 'http:'].includes(referrer.protocol) || referrer.username || referrer.password || referrer.port) return '';
      return referralOrigins.get(referrer.hostname) || '';
    } catch { return ''; }
  })();
  const readSessionState = () => {
    try { return sessionStorage.getItem(sessionKey) === 'rejected' ? 'rejected' : 'none'; }
    catch { return 'unknown'; }
  };
  const readChoice = () => {
    if (unsavedRejection) return 'rejected';
    const sessionState = readSessionState();
    if (sessionState === 'rejected') return 'rejected';
    // An unreadable session fallback must not expose an older local acceptance.
    if (sessionState === 'unknown') return null;
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && ['accepted','rejected'].includes(value.choice) && Date.now() - value.at < ttl && value.at <= Date.now() ? value.choice : null;
    } catch { return null; }
  };
  const writeChoice = choice => {
    try {
      const value = JSON.stringify({choice, at: Date.now()});
      localStorage.setItem(key, value);
      return localStorage.getItem(key) === value;
    }
    catch { return false; }
  };
  const removeOldChoice = () => {
    try { localStorage.removeItem(key); return localStorage.getItem(key) === null; }
    catch { return false; }
  };
  const saveSessionRejection = () => {
    try { sessionStorage.setItem(sessionKey, 'rejected'); return readSessionState() === 'rejected'; }
    catch { return false; }
  };
  const clearSessionRejection = () => {
    try {
      if (sessionStorage.getItem(sessionKey) !== 'rejected') return true;
      sessionStorage.removeItem(sessionKey);
      return readSessionState() === 'none';
    } catch { return false; }
  };
  const tag = function () { window.dataLayer.push(arguments); };
  function event(name, params) {
    if (!enabled || !id) return;
    tag('event', name, {...params, send_to: id, page_location: cleanLocation, page_referrer: safeReferrer, page_title: page === 'privacy' ? 'Privacy' : 'Kira Gor portfolio'});
  }
  function stopSections() {
    observer?.disconnect();
    timers.forEach(clearTimeout);
    timers.clear();
  }
  function watchSections() {
    if (!('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const name = entry.target.closest('section').id;
        if (!sections.has(name) || seen.has(name)) return;
        const sufficientlyVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        if (sufficientlyVisible && document.visibilityState === 'visible' && !timers.has(name)) {
          timers.set(name, setTimeout(() => {
            timers.delete(name);
            if (enabled && document.visibilityState === 'visible') { seen.add(name); event('section_engagement', {section_name: name}); }
          }, 2000));
        } else if (!sufficientlyVisible) { clearTimeout(timers.get(name)); timers.delete(name); }
      });
    }, {threshold: 0.5});
    document.querySelectorAll('main section[id]').forEach(section => {
      if (sections.has(section.id)) { const heading = section.querySelector('h1, h2'); if (heading) observer.observe(heading); }
    });
  }
  function enable() {
    if (!id || enabled || unsavedRejection) return;
    enabled = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    if (!loaded) {
      loaded = true;
      tag('consent', 'default', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
      tag('set', {allow_google_signals: false, allow_ad_personalization_signals: false, ads_data_redaction: true, url_passthrough: false});
      tag('js', new Date());
      tag('config', id, {send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 15552000, cookie_update: false, page_location: cleanLocation, page_referrer: safeReferrer, page_title: page === 'privacy' ? 'Privacy' : 'Kira Gor portfolio'});
      const script = document.createElement('script');
      script.async = true;
      script.referrerPolicy = 'no-referrer';
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
      document.head.appendChild(script);
      event('page_view', {});
    }
    watchSections();
  }
  function clearAnalyticsCookies() {
    const domains = ['', location.hostname, '.' + location.hostname];
    document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(n => n === '_ga' || n.startsWith('_ga_')).forEach(name => {
      domains.forEach(domain => { document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax' + (domain ? '; Domain=' + domain : ''); });
    });
  }
  function disable(reloadAllowed = false) {
    enabled = false;
    if (id) window['ga-disable-' + id] = true;
    stopSections();
    clearAnalyticsCookies();
    // Never reload into a stale acceptance when saving the new rejection failed.
    // ga-disable keeps the existing tag disabled for this page without a consent ping.
    if (loaded && reloadAllowed) location.reload();
  }
  function close() { dialog.close(); opener?.focus(); }
  function choose(choice) {
    if (choice === 'accepted' && !clearSessionRejection()) {
      unsavedRejection = true;
      saveWarning.hidden = false;
      saveWarning.textContent = 'Analytics stays off because your browser could not clear a session privacy preference. Allow browser storage or clear this site’s saved data before trying again.';
      status.textContent = saveWarning.textContent;
      disable(false);
      return;
    }
    const saved = writeChoice(choice);
    unsavedRejection = choice === 'rejected' && !saved;
    let oldChoiceRemoved = false;
    let sessionSaved = false;
    if (unsavedRejection) {
      oldChoiceRemoved = removeOldChoice();
      sessionSaved = saveSessionRejection();
    }
    status.textContent = (choice === 'accepted' ? 'Analytics accepted.' : 'Analytics rejected.') + (saved ? '' : ' Your browser could not save this choice; it applies to this page only.');
    saveWarning.hidden = saved;
    saveWarning.textContent = saved ? '' : choice === 'rejected'
      ? sessionSaved
        ? 'Analytics is off for this tab session. Your browser could not save a long-term choice.' + (oldChoiceRemoved ? ' The older saved choice was cleared.' : ' An older saved choice may apply after this tab session ends; clear this site’s saved privacy choice before returning.')
        : oldChoiceRemoved
          ? 'Analytics is off and the older saved choice was cleared. Your browser could not save the new choice, so you may be asked again on your next visit.'
          : 'Analytics is off on this page, but your browser could not save the rejection. An older choice may apply if you reload or leave this page. Clear this site’s saved privacy choice in your browser before returning.'
      : 'Your browser could not save this acceptance. It applies to this page only.';
    if (!saved) status.textContent = saveWarning.textContent;
    // Keep failed-save feedback visible until the visitor chooses to close it.
    if (saved) close();
    // Fallback storage protects a later manual reload; stay here now so its scope
    // warning remains visible until the visitor closes it.
    if (choice === 'accepted') enable(); else disable(saved);
  }
  document.querySelectorAll('[data-open-privacy]').forEach(button => button.addEventListener('click', () => { opener = button; dialog.showModal(); }));
  document.getElementById('accept-analytics').addEventListener('click', () => choose('accepted'));
  document.getElementById('reject-analytics').addEventListener('click', () => choose('rejected'));
  document.getElementById('close-privacy').addEventListener('click', close);
  document.addEventListener('click', e => {
    const action = e.target.closest('[data-analytics-action]')?.dataset.analyticsAction;
    if (actions.has(action)) event('portfolio_interaction', {interaction_name: action});
  });
  document.addEventListener('visibilitychange', () => { stopSections(); if (enabled && document.visibilityState === 'visible') watchSections(); });
  window.addEventListener('storage', e => {
    if (e.key === key || e.key === sessionKey || e.key === null) { if (readChoice() === 'accepted') enable(); else disable(!unsavedRejection); }
  });
  if (readSessionState() === 'rejected') {
    saveWarning.hidden = false;
    saveWarning.textContent = 'Analytics is off for this tab session. A long-term preference could not be saved; an older saved choice may apply after this tab session ends.';
  }
  if (readChoice() === 'accepted') enable();
  else { disable(); if (!readChoice() && id) dialog.showModal(); }
})();
