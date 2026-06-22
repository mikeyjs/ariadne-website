# Deployment Setup

## One-time steps before first push

### 1. Create a GitHub repository

1. Go to https://github.com/new
2. Name it `ariadne-works-website` (or whatever you like), set to **Private**
3. Back in this folder, run:
   ```
   git remote add origin git@github.com:YOUR_ORG/ariadne-works-website.git
   git add -A
   git commit -m "Initial commit"
   git push -u origin production
   ```

### 2. Get your Cloudflare credentials

You need two values from your Cloudflare account:

**Account ID**  
Dashboard → right sidebar → *Account ID* (copy it)

**API Token**  
Dashboard → My Profile → API Tokens → Create Token  
→ Use the **"Edit Cloudflare Workers"** template  
→ Scope it to your account → Create

### 3. Add secrets to GitHub

In your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|------|-------|
| `CLOUDFLARE_API_TOKEN` | the token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | your account ID |

### 4. Set up Turnstile

1. Cloudflare Dashboard → Turnstile → Add site
2. Domain: `ariadneworks.com` (or your Workers domain while testing)
3. Copy the **Site Key** and paste it into `index.html` replacing `YOUR_TURNSTILE_SITE_KEY`
4. Copy the **Secret Key** and run:
   ```
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```
   (paste the secret key when prompted)

### 5. Set your worker name / custom domain (optional)

In `wrangler.toml`, the `name` field becomes your workers.dev subdomain:
`ariadne-works-website.YOUR_SUBDOMAIN.workers.dev`

To use `ariadneworks.com`, add a custom domain in the Cloudflare Workers dashboard after first deploy.

---

## Deploy

From now on, any push to the `production` branch automatically deploys:

```
git add -A
git commit -m "your message"
git push origin production
```

GitHub Actions runs Wrangler and your site is live within ~30 seconds.

## Local development

```
npm install -g wrangler
wrangler dev
```

The dev server runs at http://localhost:8787 — contact form will work locally once you've set the secret key via `wrangler secret put`.
