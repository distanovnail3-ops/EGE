# Upload To GitHub

This project is a static browser game. It can be hosted with GitHub Pages from the repository root.

## Upload In Browser

1. Create a new GitHub repository.
2. Upload the contents of `github-upload.zip`, or upload these files and folders:
   - `index.html`
   - `src/`
   - `assets/`
   - `download.png`
   - `README.md`
   - `.nojekyll`
   - `.gitignore`
   - optional local runners: `start-game.cmd`, `serve.ps1`, `server.mjs`, `package.json`
3. Open repository `Settings` -> `Pages`.
4. Set source to `Deploy from a branch`.
5. Select branch `main` and folder `/root`.
6. Save. GitHub will show the public game URL after the first deploy.

## Upload With Git

```powershell
git init
git add .
git commit -m "Initial WASD Range game"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPO.git
git push -u origin main
```

Then enable GitHub Pages from `Settings` -> `Pages` using `main` and `/root`.
