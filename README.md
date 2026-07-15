# Galagoo: Neon Assault

A dependency-free HTML5 Canvas arcade shooter with a modern interface, layered effects, and the original project’s enemy formations, stages, sprites, and scoring loop.

## What’s improved

- Fully redesigned responsive arcade shell for desktop, tablet, and mobile
- Code-native Galagoo wordmark with the old logo asset removed
- Three-depth parallax starfield with twinkling color layers, speed trails, and shooting stars
- High-density particle emitters for thrusters, both weapons, impacts, boss damage, debris, smoke, shockwaves, and stage transitions
- Modern canvas HUD, animated scanlines, projectile trails, dive trails, glow, and mission feedback
- Pause/resume flow via `P`, `Escape`, the header control, or the pause dialog
- Persistent audio volume, mute state, reduced-motion preference, classic shot limit, key bindings, and local high scores
- Reliable one-shot firing and pause input, with held-key movement
- Purpose-built touch controls with an analog movement slider and fire button
- Fullscreen support and automatic pause when the tab is hidden
- Keyboard navigation, visible focus states, semantic controls, live status, and accessible labels
- Safer score rendering and resilient local-storage parsing
- Frame-time clamping to prevent simulation jumps after inactive tabs
- No build step and no third-party runtime dependencies

## Run locally

Serve the repository with any static HTTP server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

Opening `index.html` directly also works in most browsers, but a local server gives audio and storage APIs the most consistent origin behavior.

## Controls

| Action | Default input |
| --- | --- |
| Move | `A` / `D` or `←` / `→` |
| Fire | `Space` or tap/click the playfield |
| Pause / resume | `P` or `Escape` |
| Touch | Movement slider + fire button |

Controls and arcade settings can be changed from **Loadout & Controls** and are saved on the current device.

## Technology

- Vanilla JavaScript
- HTML5 Canvas
- CSS, including responsive and reduced-motion modes
- Browser local storage

## Credits

Original browser recreation by Josh Williams. Inspired by *Galaga*, originally developed by Namco. This educational fan project is not affiliated with or endorsed by Namco; original game concepts and referenced assets belong to their respective rights holders.
