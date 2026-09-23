# Pristine Poster Printing

Website for our class business. Customers can browse pricing, learn about us, and
upload their own image to order a custom printed poster.

The site is static (plain HTML, CSS, JS) so it can be hosted on GitHub Pages.
Orders and contact messages are handled by a Google Apps Script backend.

## How it works

1. A customer fills out the form on `custom.html` and picks a file.
2. The browser sends the order and the file (base64) to the Apps Script web app URL in `js/config.js`.
3. The script (`apps-script/Code.gs`) saves the file to our Google Drive folder, adds a row to the
   "Orders" tab of our Google Sheet, emails us a notification, and emails the customer a confirmation.
4. Contact messages go to the "Messages" tab of the same sheet and to our email.

## Pages

| Page | What it does |
|------|--------------|
| `index.html` | Home: letterhead masthead, hero, features, how it works, pricing preview |
| `custom.html` | Custom poster upload and order form with live pricing |
| `pricing.html` | Full price list and add-ons |
| `about.html` | Mission and team (placeholders to fill in) |
| `contact.html` | Contact form |

## Run locally

Any static server works. From this folder:

```bash
python3 -m http.server 3000
```

Then open http://localhost:3000

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo (private is fine with GitHub Pro / Student Pack).
2. Repo Settings > Pages > Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
3. The site appears at `https://<username>.github.io/<repo>/` after a minute.

## Changing the backend

- Prices live in two places: `js/config.js` (what the customer sees) and `apps-script/Code.gs`
  (what gets charged). Change both.
- After editing the script, click Deploy > Manage deployments > pencil > Version: New version > Deploy.
  The URL stays the same. Only if you create a brand-new deployment do you need to update
  `API_URL` in `js/config.js`.
- The Drive folder ID, Sheet ID, and notification email are at the top of `apps-script/Code.gs`.

## Branding

The look is taken from the company letterhead (`img/letterhead-full.webp`, kept as the source asset):

- `img/logo.png` and `mark.png` are cut from the letterhead with the paper background removed
- `img/waves.svg` recreates the wave-line corner art
- Colors are sampled from the letterhead and live as CSS variables at the top of `css/style.css`
  (navy `#0b2035`, steel `#265372`, paper tint `#e9f5fe`, divider `#87a7c3`)
- Font: Montserrat (Google Fonts), matching the wordmark

## TODO

- Confirm real prices
- Fill in real team names on the About page
- Add real photos of printed posters
