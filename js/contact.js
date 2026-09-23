// Contact form submission to the Apps Script backend
(function () {
  const CFG = window.PPP_CONFIG;
  const form = document.getElementById('contact-form');
  const err = document.getElementById('contact-error');
  const ok = document.getElementById('contact-success');
  const btn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.classList.remove('show');
    ok.classList.remove('show');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    const body = {
      type: 'contact',
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
    };
    try {
      const res = await fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Could not send message.');
      ok.classList.add('show');
      form.reset();
    } catch (e2) {
      err.textContent = e2.message === 'Failed to fetch' ? 'Could not reach the message service. Please try again.' : e2.message;
      err.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }
  });
})();
