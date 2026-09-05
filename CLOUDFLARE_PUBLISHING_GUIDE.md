# Independent publishing guide

This copy of the Rebbe Torah Chart can be published and updated without ChatGPT or Codex. It uses GitHub for safe source storage and Cloudflare Workers for hosting.

The original `chatgpt.site` address is separate. This package creates a new address controlled by your own Cloudflare account.

## What you need

Create these accounts and keep their recovery information somewhere safe:

1. A GitHub account: https://github.com/
2. A Cloudflare account: https://dash.cloudflare.com/

Use an email address you control, enable two-factor authentication, save recovery codes offline, and add a second account recovery method where available.

## Part 1 — Put the project in GitHub

1. Sign in to GitHub.
2. Create a new repository.
3. Name it `rebbe-torah-chart`.
4. Choose **Private** unless you deliberately want everyone to see the source code.
5. Do not add a README, `.gitignore`, or license on GitHub; they are already included here.
6. Unzip this package on your computer.
7. Open a terminal inside the unzipped folder.
8. Run the commands GitHub displays under **push an existing repository from the command line**.

Typical commands look like this, but use the exact repository address GitHub gives you:

```bash
git init
git add .
git commit -m "Initial independent version"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_ADDRESS
git push -u origin main
```

## Part 2 — Create the Cloudflare publishing token

1. Sign in to the Cloudflare dashboard.
2. Open your profile and locate **API Tokens**.
3. Create a token using the **Edit Cloudflare Workers** template.
4. Limit it to your own account.
5. Copy the token immediately and store it securely. Cloudflare normally shows it only once.
6. Find and copy your Cloudflare **Account ID** from the dashboard.

Never put the token in a project file, message, screenshot, or GitHub commit.

## Part 3 — Add the two GitHub secrets

In the GitHub repository:

1. Open **Settings**.
2. Open **Secrets and variables** → **Actions**.
3. Choose **New repository secret**.
4. Add:

   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: the Cloudflare API token

5. Add a second secret:

   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: the Cloudflare Account ID

The included `.github/workflows/deploy-cloudflare.yml` file uses these secrets without exposing them.

## Part 4 — Publish for the first time

The GitHub workflow runs automatically whenever the `main` branch changes.

1. Open the GitHub repository.
2. Select the **Actions** tab.
3. Select **Deploy to Cloudflare**.
4. If it has not already run, select **Run workflow**.
5. Wait for the green check mark.
6. Open the completed **Publish to Cloudflare Workers** step to see the new `workers.dev` website address.

Cloudflare may ask you to enable a `workers.dev` subdomain the first time. Complete that one-time setup in the Cloudflare dashboard.

## Part 5 — Edit and update the website later

You do not need ChatGPT.

1. Install Node.js 22 or newer: https://nodejs.org/
2. Install Visual Studio Code or another text editor: https://code.visualstudio.com/
3. Download or clone your GitHub repository.
4. Edit the appropriate file:

   - `app/page.tsx` — interface, text, buttons, editing, and chart display
   - `app/globals.css` — design, fonts, table sizes, and PDF printing
   - `app/api/generate/route.ts` — data collection and matching rules
   - `app/api/export-docx/route.ts` — Word downloads
   - `public/jem-video-metadata.json` — video metadata

5. Test the project:

```bash
npm ci
npm run build
```

6. Save the update to GitHub:

```bash
git add .
git commit -m "Describe the update"
git push
```

GitHub will automatically run the build and Cloudflare will publish the new version.

## Publish manually without GitHub Actions

You can publish from your own computer instead:

```bash
npm ci
npx wrangler login
npm run deploy:cloudflare
```

`npx wrangler login` opens Cloudflare in your browser. After the first login, `npm run deploy:cloudflare` builds and publishes the site.

## Use your own domain

A domain you own is the best long-term address because it is not tied to ChatGPT, GitHub, or a particular hosting provider.

After the Worker is published:

1. Add your domain to Cloudflare.
2. Open **Workers & Pages** in Cloudflare.
3. Open the `rebbe-torah-chart` Worker.
4. Open its domains/routes settings.
5. Add a custom domain such as `mafteach.example.com`.

Keep the domain registration account and Cloudflare recovery codes secure. If you later change hosting providers, the same domain can point to the replacement website.

## Backups you should keep

Keep all of these in at least two places:

- This ZIP archive
- The GitHub repository
- The original Excel metadata workbook
- `REBBE_TORAH_CHART_PROJECT_HANDOFF.md`
- Cloudflare and GitHub recovery codes
- A record of your custom domain registrar, if you buy a domain

Do not store API tokens or passwords inside the repository or the ZIP archive.

## Troubleshooting

### GitHub Action says a secret is missing

Confirm both secret names are exact:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Build fails

Use Node.js 22 or newer and run:

```bash
npm ci
npm run build
```

Read the first error in the output. Do not delete the lockfile merely to silence an installation problem.

### Cloudflare deployment fails after a successful build

Check that the API token has Workers edit permission for the correct Cloudflare account. If the token was exposed, revoke it and create a replacement.

### The website works but fonts or video metadata are missing

Confirm that `public/fonts/` and `public/jem-video-metadata.json` are present in GitHub. They are required runtime assets.

### Roll back a bad update

In GitHub, revert the bad commit or restore the previous files and push again. Cloudflare will publish the restored version. Cloudflare may also provide deployment rollback controls in the Worker dashboard.

