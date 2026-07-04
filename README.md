# Velocube — velocube.net

Landing page for Velocube, a New York web design studio that builds custom, SEO-ready websites using AI-assisted development.

## Structure

```
index.html        Landing page
css/global.css    Design tokens, header, footer, buttons — shared by every page
css/home.css      Landing-page-only styles
js/global.js      Nav, sticky header, scroll reveals — shared by every page
js/home.js        Pricing slider, carousel, stats, quote form
assets/           Brand assets (see below)
robots.txt        Search engine directives
sitemap.xml       Sitemap (add new pages here as the site grows)
```

### Brand assets

- `Velocube.webp` — original full logo (white background); used for Organization schema
- `glyph.png` — hexagon mark extracted with transparency; used in header/footer
- `velo1.png` / `velo3.png` — Velo mascot renders (hero and closing CTA)
- `favicon.png`, `apple-touch-icon.png` — generated from the glyph
- `og-image.png` — 1200x630 social share card built from the real logo

## Before going live

1. **Quote form:** sign up at [formspree.io](https://formspree.io) (free), create a form pointed at `hr@velocube.net`, and replace `YOUR_FORM_ID` in the form `action` in `index.html`.

## Run locally

Any static server works, e.g.:

```
npx serve .
```
