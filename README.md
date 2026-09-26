# ZeeFrames — Project Estimator

A drop-in section for zeeframes.com that estimates the budget, timeline and team
for a design project. Live demo: https://semenovmak111-create.github.io/zeeframes-estimator/
(cream variant: `?theme=light`).

## Embed

1. Copy the `<section class="zfe" id="estimator">…</section>` block from `index.html`.
2. Add `estimator.css` to the page `<head>` and `estimator.js` before `</body>`.

The block uses the fonts the site already loads (Inter Tight, Inter, Geologica) and the
tokens from `colors.css` (`--color-primary`, `--color-black-300` …), with fallbacks, so it
also works on its own. All classes are prefixed `zfe-` and don't collide with site styles.

- Dark section (default): place between two cream sections.
- Cream section: add `zfe--light` → `<section class="zfe zfe--light" id="estimator">`.

## Prices

All numbers are in the `PRICING` object at the top of `estimator.js`: blended hourly rate,
hours per screen by complexity, per-service multipliers and screen ranges, add-ons,
priority markup and team thresholds. The shipped values are placeholders calibrated to
the timelines stated on the service pages (MVP 2–4 weeks, SaaS 4–12, revamp 6–14) —
replace them with the real rate card.

The “Get Your Exact Quote” button links to `/work-with-us?estimate=…` with a
one-line summary of the chosen scope, ready to be prefilled into the Message field.
