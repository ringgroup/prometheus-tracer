# Prometheus Tracer

A Bloomberg/TradingView-style terminal for tracking body-composition over a
retatrutide protocol, built from InBody-770 scale readings.

**Live:** _add your Vercel URL here_

## Features
- **Top panel** — Weight on the left axis with a dashed baseline + shaded "total lost" band; Body Fat % featured on the right axis.
- **Bottom subplot** — Fat Mass & Muscle, MACD-style, sharing the time axis.
- **Goal progress bar** toward the target loss.
- Interactive controls: toggle series (keys 1–4), `ALL` / `BODY FAT` view, `DAY` / `DATE` x-axis, milestone markers (`M`).
- Crosshair + data window that scrubs every reading.

## Stack
Single self-contained `index.html` (Chart.js via CDN, data embedded). No build step.

## Local dev
Just open `index.html` in a browser, or:
```bash
npx serve .
```

## Deploy (Vercel)
```bash
npm i -g vercel
vercel --prod
```
It's a static site — Vercel auto-detects, no framework config needed.
