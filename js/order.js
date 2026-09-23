// Custom poster order form: file preview, live pricing, and submission to the Apps Script backend.
(function () {
  const CFG = window.PPP_CONFIG;
  const prices = CFG.PRICES;

  const form = document.getElementById('order-form');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('poster');
  const preview = document.getElementById('preview');
  const previewContent = document.getElementById('preview-content');
  const fileMeta = document.getElementById('file-meta');
  const removeBtn = document.getElementById('remove-file');
  const errorBox = document.getElementById('form-error');
  const submitBtn = document.getElementById('submit-btn');

  const sizeEl = document.getElementById('size');
  const finishEl = document.getElementById('finish');
  const qtyEl = document.getElementById('quantity');
  const lamEl = document.getElementById('laminate');

  let selectedFile = null;

  function money(n) { return '$' + n.toFixed(2); }

  function updateSummary() {
    const size = prices.sizes[sizeEl.value];
    const finish = prices.finishes[finishEl.value];
    const qty = Math.max(1, parseInt(qtyEl.value, 10) || 1);
    const lam = lamEl.checked;
    const each = size.price + finish.price + (lam ? prices.lamination : 0);

    document.getElementById('sum-size').textContent = size.label.replace(/\s*\(.*\)/, '');
    document.getElementById('sum-finish').textContent = finish.label;
    document.getElementById('sum-lam').textContent = lam ? 'Yes' : 'No';
    document.getElementById('sum-qty').textContent = qty;
    document.getElementById('sum-total').textContent = money(each * qty);
  }
  [sizeEl, finishEl, qtyEl, lamEl].forEach((el) => el.addEventListener('change', updateSummary));
  qtyEl.addEventListener('input', updateSummary);
  updateSummary();

  // ----- File selection + preview -----
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('show');
    window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
  }
  function clearError() { errorBox.classList.remove('show'); }

  function formatBytes(b) {
    if (b > 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
    return Math.round(b / 1024) + ' KB';
  }

  function handleFile(file) {
    if (!file) return;
    const okTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    if (!okTypes.includes(file.type)) {
      showError('Please upload a PNG, JPG, WEBP, or PDF file.');
      fileInput.value = '';
      return;
    }
    if (file.size > CFG.MAX_FILE_MB * 1024 * 1024) {
      showError(`That file is over ${CFG.MAX_FILE_MB} MB. Please compress it or choose a smaller file.`);
      fileInput.value = '';
      return;
    }
    clearError();
    selectedFile = file;

    previewContent.innerHTML = '';
    if (file.type === 'application/pdf') {
      previewContent.innerHTML = '<div class="pdf-badge">PDF</div>';
      fileMeta.textContent = `${file.name} · ${formatBytes(file.size)}`;
    } else {
      const img = document.createElement('img');
      img.alt = 'Poster preview';
      img.onload = () => {
        const warn = img.naturalWidth < 1500 && img.naturalHeight < 1500
          ? ' · ⚠️ Low resolution: print may look blurry at large sizes'
          : '';
        fileMeta.textContent = `${file.name} · ${formatBytes(file.size)} · ${img.naturalWidth}×${img.naturalHeight}px${warn}`;
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
      previewContent.appendChild(img);
    }
    dropzone.style.display = 'none';
    preview.style.display = 'block';
  }

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

  ['dragenter', 'dragover'].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); })
  );
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  removeBtn.addEventListener('click', () => {
    fileInput.value = '';
    selectedFile = null;
    previewContent.innerHTML = '';
    preview.style.display = 'none';
    dropzone.style.display = 'block';
  });

  // Read a File as base64 (without the data: prefix)
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(new Error('Could not read the file.'));
      r.readAsDataURL(file);
    });
  }

  // ----- Submit -----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    if (!selectedFile) return showError('Please upload a file for your poster.');
    if (!form.name.value.trim()) return showError('Please enter your name.');
    if (!form.email.value.trim() || !form.email.checkValidity()) return showError('Please enter a valid email address.');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    try {
      const payload = {
        type: 'order',
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        notes: form.notes.value.trim(),
        size: sizeEl.value,
        finish: finishEl.value,
        quantity: qtyEl.value,
        laminate: lamEl.checked,
        file: {
          name: selectedFile.name,
          mimeType: selectedFile.type,
          data: await toBase64(selectedFile),
        },
      };

      // Sent as text/plain so the browser does not need a CORS preflight (Apps Script can't answer one).
      const res = await fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Something went wrong.');

      const o = data.order;
      document.getElementById('success-id').textContent = o.id;
      document.getElementById('success-detail').textContent =
        `${o.poster.quantity} × ${o.poster.sizeLabel}, ${o.poster.finishLabel}` +
        (o.poster.laminate ? ', laminated' : '') + ` · Total ${money(o.total)}`;
      document.getElementById('order-form-wrap').style.display = 'none';
      document.getElementById('order-success').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showError(err.message === 'Failed to fetch'
        ? 'Could not reach the order service. Please check your connection and try again.'
        : err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Order';
    }
  });
})();
