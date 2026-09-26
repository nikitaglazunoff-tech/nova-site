# NOVA — Interactive 3D Automotive Site

Premium one-page automotive concept built with HTML/CSS/JavaScript, Three.js, GSAP and ScrollTrigger.

## Files
- `index.html` — page structure and CDN imports
- `style.css` — responsive premium UI
- `script.js` — Three.js scene, GLB loading, configurator, interactions and animations
- `assets/car.glb` — optional licensed 3D vehicle model

## Run locally
Browsers often block local GLB loading from `file://`, so use an HTTP server.

### VS Code
Use the Live Server extension and open `index.html` with Live Server.

### Python
From the project folder:

`python -m http.server 8000`

Open `http://localhost:8000`.

## Add the real 3D car
Put the model at:

`assets/car.glb`

The page loads it automatically. If the file is missing or fails to load, a lightweight procedural fallback vehicle is rendered so the site still works.

### Material names for color changing
The configurator looks for material/object names containing:

`body`, `paint`, `car`, `exterior`, `shell`, `metal`

If your GLB uses a different paint material name, adjust the `looksLikePaint` expression in `script.js`.

Wheel/interior selectors are UI-ready. They do not alter a real GLB unless matching wheel/interior meshes are present; extend those handlers for a specific model's node names.

## Publish on GitHub Pages
Upload the project to a GitHub repository with `index.html` at the root, then enable GitHub Pages for the repository. Keep `assets/car.glb` in the same project so the relative URL `assets/car.glb` remains valid.

## Note
The performance figures, price and brand text are fictional demo content and should be replaced before commercial use.
