/**
 * Pristine Poster Printing - order backend (Google Apps Script)
 *
 * Receives custom poster orders and contact messages from the website,
 * saves the uploaded poster to Google Drive, logs the order in a Google Sheet,
 * and emails a notification.
 *
 * Deploy as: Web app, Execute as "Me", Who has access "Anyone".
 */

// ---------------- CONFIG ----------------
const SHEET_ID = '1p2yvVjyO8Rwu8vEMBCo-1QpoK-phuRjRCt_LL0DTfv0';
const UPLOAD_FOLDER_ID = '1ZDV5NlGKnFkkABI5_0H7ZWIDWyuyXfwH'; // from the folder's URL: drive.google.com/drive/folders/<ID>
const NOTIFY_EMAIL = '';       // leave blank to use the Google account that deploys this script
const SEND_CUSTOMER_CONFIRMATION = true;
const MAX_FILE_MB = 25;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

const PRICES = {
  sizes: {
    '11x17': { label: '11" x 17" (Small)', price: 12 },
    '18x24': { label: '18" x 24" (Medium)', price: 20 },
    '24x36': { label: '24" x 36" (Large)', price: 32 },
  },
  finishes: {
    matte: { label: 'Matte', price: 0 },
    glossy: { label: 'Glossy', price: 3 },
  },
  lamination: 5,
};
// ----------------------------------------

function doGet() {
  return json({ ok: true, service: 'Pristine Poster Printing backend', prices: PRICES });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.type === 'contact') return json(handleContact(body));
    return json(handleOrder(body));
  } catch (err) {
    return json({ ok: false, error: 'Server error: ' + err.message });
  }
}

// ---------------- Orders ----------------
function handleOrder(b) {
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const phone = String(b.phone || '').trim();
  const notes = String(b.notes || '').trim();
  const size = b.size, finish = b.finish;
  const quantity = Math.max(1, parseInt(b.quantity, 10) || 1);
  const laminate = b.laminate === true || b.laminate === 'true' || b.laminate === 'on';

  if (!name || !email) return { ok: false, error: 'Name and email are required.' };
  if (!PRICES.sizes[size] || !PRICES.finishes[finish]) return { ok: false, error: 'Please choose a valid size and finish.' };
  if (!b.file || !b.file.data) return { ok: false, error: 'Please attach an image or PDF for your poster.' };
  if (ALLOWED_TYPES.indexOf(b.file.mimeType) === -1) return { ok: false, error: 'Only PNG, JPG, WEBP, or PDF files are allowed.' };

  const bytes = Utilities.base64Decode(b.file.data);
  if (bytes.length > MAX_FILE_MB * 1024 * 1024) return { ok: false, error: 'File is too large. Max size is ' + MAX_FILE_MB + ' MB.' };

  const sheet = getSheet('Orders', [
    'Order ID', 'Date', 'Status', 'Name', 'Email', 'Phone',
    'Size', 'Finish', 'Laminated', 'Quantity', 'Total', 'Notes', 'File name', 'File link'
  ]);
  const orderId = 'PPP-' + pad(sheet.getLastRow()); // header row is 1, so first order = PPP-0001

  const safeName = String(b.file.name || 'poster').replace(/[^\w.\-]+/g, '_');
  const blob = Utilities.newBlob(bytes, b.file.mimeType, orderId + '-' + safeName);
  const file = getUploadFolder().createFile(blob);
  const fileUrl = file.getUrl();

  const total = (PRICES.sizes[size].price + PRICES.finishes[finish].price + (laminate ? PRICES.lamination : 0)) * quantity;
  const sizeLabel = PRICES.sizes[size].label, finishLabel = PRICES.finishes[finish].label;

  sheet.appendRow([
    orderId, new Date(), 'new', name, email, phone,
    sizeLabel, finishLabel, laminate ? 'Yes' : 'No', quantity, total, notes, b.file.name || '', fileUrl
  ]);

  const summary = quantity + ' x ' + sizeLabel + ', ' + finishLabel + (laminate ? ', laminated' : '') + ' - Total $' + total.toFixed(2);

  MailApp.sendEmail({
    to: notifyEmail(),
    subject: 'New poster order ' + orderId + ' from ' + name,
    htmlBody:
      '<h2>New order ' + orderId + '</h2>' +
      '<p><b>Customer:</b> ' + esc(name) + ' &lt;' + esc(email) + '&gt;' + (phone ? ' / ' + esc(phone) : '') + '</p>' +
      '<p><b>Poster:</b> ' + esc(summary) + '</p>' +
      (notes ? '<p><b>Notes:</b> ' + esc(notes) + '</p>' : '') +
      '<p><b>File:</b> <a href="' + fileUrl + '">' + esc(b.file.name || 'download') + '</a></p>' +
      '<p><a href="https://docs.google.com/spreadsheets/d/' + SHEET_ID + '">Open the orders sheet</a></p>',
  });

  if (SEND_CUSTOMER_CONFIRMATION) {
    MailApp.sendEmail({
      to: email,
      subject: 'Pristine Poster Printing - order ' + orderId + ' received',
      htmlBody:
        '<p>Hi ' + esc(name) + ',</p>' +
        '<p>Thanks for your order! We received your file and will email you when your poster is ready.</p>' +
        '<p><b>Order number:</b> ' + orderId + '<br><b>Details:</b> ' + esc(summary) + '</p>' +
        '<p>Payment is collected at pickup.</p>' +
        '<p>Pristine Poster Printing<br>1280 Johnson Ave, San Jose, CA 95129<br>408-913-0756</p>',
    });
  }

  return {
    ok: true,
    order: {
      id: orderId, total: total,
      poster: { quantity: quantity, sizeLabel: sizeLabel, finishLabel: finishLabel, laminate: laminate },
    },
  };
}

// ---------------- Contact form ----------------
function handleContact(b) {
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim();
  const message = String(b.message || '').trim();
  if (!name || !email || !message) return { ok: false, error: 'All fields are required.' };

  getSheet('Messages', ['Date', 'Name', 'Email', 'Message']).appendRow([new Date(), name, email, message]);

  MailApp.sendEmail({
    to: notifyEmail(),
    replyTo: email,
    subject: 'Website message from ' + name,
    htmlBody: '<p><b>From:</b> ' + esc(name) + ' &lt;' + esc(email) + '&gt;</p><p>' + esc(message).replace(/\n/g, '<br>') + '</p>',
  });
  return { ok: true };
}

// ---------------- Helpers ----------------
function getSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getUploadFolder() {
  return DriveApp.getFolderById(UPLOAD_FOLDER_ID);
}

function notifyEmail() {
  return NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
}

function pad(n) { return ('0000' + n).slice(-4); }

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
