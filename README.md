# Rutik Sankapal – Cloud Engineer portfolio

Vite + vanilla JS + Three.js + GSAP. Hero: a 3D cloud-lifecycle loop (Plan → Design → Provision → Secure → Deploy → Operate → Monitor → Optimize). Deploys to GitHub Pages with GitHub Actions.

## Run locally (Node.js 20+)
```bash
bash personalize.sh <your-github-username>   # once
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
```

## Where to edit
| What | File |
|---|---|
| All text, projects, skills, certifications | `index.html` |
| Email, GitHub, LinkedIn used by the terminal and Ctrl+K | `src/ui/terminal.js`, `src/ui/palette.js` |
| Stage names on the 3D loop, colours, speed | `src/config.js` |
| Demo log lines on the ops board | `src/ui/dashboard.js` |
| CV file | `public/resume.pdf` (keep the name) |

## Host on GitHub Pages (user site)
1. Create a **public** repo named exactly `<your-username>.github.io`.
2. In this folder: `git init`, `git add .`, `git commit -m "Portfolio"`, `git branch -M main`,
   `git remote add origin https://github.com/<your-username>/<your-username>.github.io.git`, `git push -u origin main`.
3. Repo → **Settings → Pages → Source: GitHub Actions**.
4. Open the **Actions** tab; wait for "Deploy portfolio to GitHub Pages" to turn green (about 1–2 minutes).
5. Visit `https://<your-username>.github.io`. Every later `git push` to `main` redeploys.

Using a different repo name (project site)? Set `base: '/<repo-name>/'` in `vite.config.js`.
