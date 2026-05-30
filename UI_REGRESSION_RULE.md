# UI Regression Rule

When changing SlideForge UI behavior, presentation mode, slide rendering, properties, insertion tools, or header buttons:

1. Run the frontend syntax check.

```sh
npm run check:frontend
```

2. Run the browser smoke test against a local static server.

```sh
python3 -m http.server 8076
SLIDEFORGE_TEST_URL=http://127.0.0.1:8076/ npm run test:ui
```

3. For presentation transition changes, verify:
   - Fade uses Reveal.js native `fade`.
   - Diffuse maps to Reveal.js native `fade`.
   - `.presentation-slide-transition-clone` count remains `0`.

4. Update `TEST_PLAN.md` and `tests/browser/test-ui-smoke.js` when adding a major user-facing feature.
