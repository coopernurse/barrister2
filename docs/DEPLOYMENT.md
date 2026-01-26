# Deploying PulseRPC2 Documentation to GitHub Pages

This guide covers deploying the PulseRPC2 documentation to GitHub Pages.

## Prerequisites

1. **Repository must be public** (or have GitHub Pro for private repos)
2. **GitHub Actions enabled** for the repository
3. **Admin access** to repository settings

## Quick Start (3 Steps)

### Step 1: Enable GitHub Pages

1. Go to repository **Settings**
2. Click **Pages** in left sidebar
3. Under **Build and deployment**, select **Source: GitHub Actions**

That's it! The workflow is already configured in `.github/workflows/docs-deploy.yml`

### Step 2: Push to Main Branch

```bash
# Make your changes
git add docs/
git commit -m "Update documentation"

# Push to trigger deployment
git push origin main
```

### Step 3: View Your Site

- Check the **Actions** tab to see the deployment progress
- Once complete, your site will be at: `https://<username>.github.io/pulserpc/`

## How It Works

### Automatic Deployment

The `.github/workflows/docs-deploy.yml` workflow:

1. **Triggers** on push to `main` branch (when `docs/**` changes)
2. **Installs** Ruby and Jekyll dependencies
3. **Builds** the site with `bundle exec jekyll build`
4. **Deploys** to GitHub Pages automatically

### Manual Deployment

You can also trigger deployment manually:

1. Go to **Actions** tab
2. Select **Documentation Deploy** workflow
3. Click **Run workflow** button
4. Select `main` branch and run

## Local Development

### Build Documentation

```bash
# Build the documentation site
make docs-build

# View at docs/_site/
```

### Serve Locally

```bash
# Start Jekyll dev server at http://localhost:4000
make docs-serve

# Or directly
cd docs
bundle exec jekyll serve --host 0.0.0.0 --port 4000
```

### Clean Build

```bash
# Remove generated files
make docs-clean
```

## URL Configuration

### Base URL

The documentation is configured for GitHub Pages at `/pulserpc` in `docs/_config.yml`:

```yaml
baseurl: /pulserpc
```

### Custom Domain (Optional)

To use a custom domain:

1. Add `CNAME` file to `docs/` directory:
   ```
   docs.yourdomain.com
   ```

2. Update DNS at your domain provider

3. Update `docs/_config.yml`:
   ```yaml
   baseurl: ""  # Empty for custom domain root
   url: "https://docs.yourdomain.com"
   ```

## CI/CD Pipeline

### Documentation Tests (`.github/workflows/docs-ci.yml`)

Runs on every pull request:

- **Tests all language examples** (Python, Go, Java, TypeScript, C#)
- **Builds Jekyll site** to catch errors
- **Checks for broken links** (internal only)

### Documentation Deploy (`.github/workflows/docs-deploy.yml`)

Runs on push to main:

- **Builds Jekyll site**
- **Deploys to GitHub Pages**

## Troubleshooting

### Build Failures

**Problem**: Jekyll build fails

**Solution**:
```bash
# Test locally first
cd docs
bundle install
bundle exec jekyll build --verbose
```

**Common issues**:
- Missing Ruby dependencies → Run `bundle install`
- Invalid front matter in markdown files
- Broken liquid template syntax

### Deployment Fails

**Problem**: GitHub Actions deployment fails

**Check**:
1. **Actions** tab for error logs
2. **Repository Settings → Pages** is set to "GitHub Actions"
3. **Workflow permissions** are enabled (Settings → Actions → General)

**"Multiple artifacts" error**:
```
Error: Multiple artifacts named "github-pages" were unexpectedly found
```

**Cause**: Multiple workflow runs completed simultaneously (e.g., from rapid commits)

**Solution**:
1. Cancel any in-progress workflow runs in Actions tab
2. Wait a few minutes for artifacts to auto-expire
3. Re-run the deployment manually:
   - Go to Actions → Documentation Deploy
   - Click "Run workflow" → Select `main` branch → Run

The workflow now has `cancel-in-progress: true` to prevent this issue.

### 404 Errors

**Problem**: Site deployed but getting 404s

**Solutions**:
1. Wait 1-2 minutes for DNS propagation
2. Check `baseurl` in `docs/_config.yml` matches your repo name
3. Clear browser cache

### Styling Missing

**Problem**: Site loads but no CSS

**Check**:
1. `docs/assets/css/styles.css` exists
2. `docs/_layouts/default.html` includes CSS correctly
3. Browser console for 404s on CSS files

## Architecture

```
docs/
├── _config.yml          # Jekyll configuration
├── _layouts/            # HTML templates
├── _includes/           # Reusable components
├── _plugins/            # Custom Liquid tags
├── assets/              # CSS, JS, images
├── get-started/         # Installation, quickstart overview
├── idl-guide/           # IDL syntax, types, validation
├── languages/           # Language-specific docs
└── index.md             # Homepage

Build output:
docs/_site/              # Generated static site (deployed to GH Pages)
```

## Makefile Targets

```bash
make docs-build   # Build documentation to docs/_site/
make docs-serve   # Serve locally at http://localhost:4000
make docs-clean   # Remove build artifacts
```

## Best Practices

1. **Preview locally** before pushing to main
2. **Use pull requests** to preview changes via CI
3. **Test all links** after making structural changes
4. **Keep dependencies updated**: `bundle update` periodically
5. **Monitor build logs** in Actions tab

## Advanced: Multi-Instance Deployment

For multiple environments (staging/prod):

1. Duplicate workflow as `docs-deploy-staging.yml`
2. Change branch trigger to `staging`
3. Use different GitHub Pages environment

## Security Notes

- **No secrets required** for public repo Pages deployment
- **Workflow permissions** automatically configured by GitHub
- **Dependencies** pinned in `docs/Gemfile.lock`

## Monitoring

### Check Deployment Status

```bash
# List recent workflow runs
gh run list --workflow=docs-deploy.yml

# View specific run
gh run view <run-id>
```

### Analytics

Enable in **Settings → Pages**:
- GitHub provides built-in traffic analytics
- Can add Google Analytics via `docs/_includes/custom/head.html`

## Resources

- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
