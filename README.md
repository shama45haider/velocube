# Velocube — velocube.net

Landing page for Velocube, a New York web design studio that builds custom, SEO-ready websites using AI-assisted development.

## Structure

```
index.html        Landing page
css/global.css    Design tokens, header, footer, buttons — shared by every page
css/home.css      Landing-page-only styles
js/global.js      Nav, sticky header, scroll reveals — shared by every page
js/home.js        Pricing slider, carousel, stats, quote form
assets/           Logo, favicon, OG image
robots.txt        Search engine directives
sitemap.xml       Sitemap (add new pages here as the site grows)
```

## Before going live

1. **Quote form:** sign up at [formspree.io](https://formspree.io) (free), create a form pointed at `hr@velocube.net`, and replace `YOUR_FORM_ID` in the form `action` in `index.html`.
2. **OG image:** social platforms don't reliably render SVG previews. Export `assets/og-image.svg` to a 1200x630 PNG and update the `og:image` / `twitter:image` tags.

## Run locally

Any static server works, e.g.:

```
npx serve .
```
