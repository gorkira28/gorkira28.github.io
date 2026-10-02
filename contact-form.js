(() => {
  'use strict';
  const config = window.PORTFOLIO_CONFIG || {};
  const form = document.getElementById('recruiter-form');
  if (!form) return;
  const status = document.getElementById('form-status');
  const button = form.querySelector('button[type="submit"]');
  let endpoint;
  try { endpoint = new URL(config.formEndpoint); } catch { return; }
  if (endpoint.origin !== 'https://formspree.io' || !/^\/f\/[a-zA-Z0-9]+$/.test(endpoint.pathname) || endpoint.search || endpoint.hash || endpoint.username || endpoint.password || !config.formProvider) return;
  let policy;
  try { policy = new URL(config.formPrivacyUrl); } catch { return; }
  if (policy.protocol !== 'https:') return;
  document.querySelectorAll('[data-form-provider]').forEach(el => { el.textContent = config.formProvider; });
  document.querySelectorAll('[data-form-policy]').forEach(el => { el.href = policy.href; });
  form.hidden = false;
  form.action = endpoint.href;
  button.disabled = false;
  document.getElementById('form-unavailable').hidden = true;
  let submitting = false;
  const requiredFields = ['name', 'email', 'message'];
  function validate() {
    requiredFields.forEach(name => {
      const field = form.elements[name];
      field.setCustomValidity(field.value.trim() ? '' : 'Please enter your ' + name + '.');
    });
    return form.reportValidity();
  }
  form.addEventListener('input', () => {
    requiredFields.forEach(name => form.elements[name].setCustomValidity(''));
  });
  form.addEventListener('submit', async event => {
    if (config.formMode !== 'ajax') {
      // Standard POST lets the provider handle its own CAPTCHA and confirmation page.
      if (submitting) { event.preventDefault(); return; }
      if (!validate()) { event.preventDefault(); return; }
      submitting = true;
      button.disabled = true;
      button.textContent = 'Opening secure submission…';
      return;
    }
    event.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    submitting = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = 'Sending your message.';
    const payload = new FormData();
    ['name','email','company','message','_gotcha'].forEach(name => payload.append(name, form.elements[name].value.trim()));
    payload.append('followup_permission', form.elements.followup_permission.checked ? 'Yes, you may contact me about future professional opportunities.' : 'No future-opportunity follow-up permission.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint.href, {method: 'POST', body: payload, headers: {Accept: 'application/json'}, credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal});
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('unconfirmed');
      form.reset();
      status.textContent = 'Your message was accepted by the contact service. Thank you for reaching out.';
    } catch {
      status.textContent = 'Delivery could not be confirmed. Your message is still here. Please check before trying again, or use the email links above; another submission may create a duplicate.';
    } finally {
      clearTimeout(timer);
      submitting = false;
      button.disabled = false;
      button.textContent = 'Send message';
    }
  });
  window.addEventListener('pageshow', () => {
    submitting = false;
    button.disabled = false;
    button.textContent = 'Send message';
  });
})();
