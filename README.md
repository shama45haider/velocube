# Velocube — velocube.net

Multi-page website for Velocube. Velocube builds, launches, and maintains websites, apps, and digital services for businesses — development, branding, hosting, and ongoing maintenance from one company.

## Structure

```
index.html        Home — what Velocube does, services overview, why us
services.html     All 19 services, grouped and explained
pricing.html      Project estimates, monthly services, add-ons
management.html   Website Management Subscription
careers.html      Open roles and how to apply
contact.html      Quote form and direct contact info
css/site.css      One stylesheet: dark premium design system
js/site.js        Nav, sticky header, scroll reveals, contact form
assets/           Brand assets (see below)
robots.txt        Search engine directives
sitemap.xml       All six pages
```

### Brand assets

- `Velocube.webp` — original full logo (white background); used for Organization schema
- `glyph.png` — hexagon mark extracted with transparency; used in header/footer
- `velo1.png` / `velo3.png` — Velo mascot renders (black-background, used on the dark theme)
- `favicon.png`, `apple-touch-icon.png` — generated from the glyph
- `og-image.png` — 1200x630 social share card built from the real logo

## Before going live

1. **Quote form:** sign up at [formspree.io](https://formspree.io) (free), create a form pointed at `hr@velocube.net`, and replace `YOUR_FORM_ID` in the form `action` in `contact.html`.

## Run locally

Any static server works, e.g.:

```
npx serve .
```
