# PulseRPC2 Documentation

This directory contains the PulseRPC2 documentation site, built with [Jekyll](https://jekyllrb.com/) using the [Just the Docs](https://just-the-docs.github.io/just-the-docs/) theme.

## Quick Start

### Prerequisites

- Ruby 3.0 or higher
- Bundler (`gem install bundler`)
- GCC/Make (for building native extensions)

### Installation

1. **Install dependencies:**
   ```bash
   cd /workspace/docs
   bundle install
   ```

2. **Start the development server:**
   ```bash
   bundle exec jekyll serve
   ```

3. **Open in browser:**
   Navigate to http://localhost:4000/pulserpc/

## Development Workflow

### Running Locally

To run the documentation site locally:

```bash
cd /workspace/docs
bundle exec jekyll serve
```

The site will be available at http://localhost:4000/pulserpc/

**Options:**
- `--host 0.0.0.0` - Serve on all network interfaces (useful for Docker)
- `--port 4001` - Use different port if 4000 is in use
- `--livereload` - Auto-reload on file changes (default)

### Building for Production

To build the static site for deployment:

```bash
cd /workspace/docs
bundle exec jekyll build
```

The built files will be in `_site/` directory.

**Build options:**
- `--profile` - Generate build profile to identify slow pages
- `--trace` - Show full backtrace on errors
- `--verbose` - Print verbose output

### Watching for Changes

During development, use the serve command with live reload:

```bash
bundle exec jekyll serve --livereload
```

Changes to Markdown files, layouts, and CSS will automatically rebuild the site.

## Project Structure

```
docs/
├── _config.yml              # Jekyll configuration
├── _data/                   # Data files for dynamic content
├── _includes/               # Reusable includes (header, footer, etc.)
├── _layouts/                # Page layout templates
├── _sass/                   # SCSS source files
│   └── custom/             # Custom theme overrides
├── _plugins/                # Custom Jekyll plugins
├── _site/                   # Generated site (not in git)
├── assets/                  # Static assets
│   ├── css/                # Custom CSS
│   ├── js/                 # JavaScript files
│   └── images/             # Images and icons
├── advanced/                # Advanced topics
├── examples/                # Code examples
├── get-started/             # Getting started guides
├── idl-guide/              # IDL language guide
├── languages/              # Language-specific docs
├── plans/                  # Design plans
├── index.md                # Homepage
├── CALLOUTS.md             # Callout syntax guide
├── DEPLOYMENT.md           # Deployment instructions
└── README.md               # This file
```

## Configuration

### Jekyll Configuration (`_config.yml`)

Key settings in `_config.yml`:

```yaml
title: PulseRPC2 RPC
description: IDL-based JSON-RPC code generation
baseurl: /pulserpc
theme: just-the-docs

# Search
search_enabled: true
heading_anchors: true

# Footer
footer_content: "Copyright © 2026 PulseRPC2"
```

### Theme Customization

Custom styles are defined in:

- **`_sass/custom/custom.scss`** - SCSS variables and component styles
- **`assets/css/custom.scss`** - Import custom SCSS
- **`assets/css/styles.css`** - Additional custom CSS

For detailed customization instructions, see [advanced/theming.md](advanced/theming.md).

## Creating Content

### Adding a New Page

1. Create a new `.md` file in the appropriate directory
2. Add front matter:
   ```yaml
   ---
   title: "Page Title"
   parent: "Section Name"
   nav_order: 1
   ---
   ```
3. Write content in Markdown
4. The page will automatically appear in navigation

### Adding Code Examples

Use fenced code blocks with syntax highlighting:

````markdown
\```python
def hello_world():
    print("Hello, PulseRPC2!")
\```
````

Supported languages: `python`, `java`, `go`, `javascript`, `typescript`, `csharp`, `bash`, `json`, `yaml`, and more.

### Using Callouts

Callouts highlight important information:

```html
<div class="callout callout-note">
  <div class="callout-icon">ℹ️</div>
  <div class="callout-content">
    <strong>Note:</strong> This is important information.
  </div>
</div>
```

Available types: `callout-note`, `callout-tip`, `callout-warning`, `callout-important`, `callout-danger`.

See [CALLOUTS.md](CALLOUTS.md) for detailed examples.

### Adding Images

Place images in `assets/images/` and reference them:

```markdown
![Alt text](/pulserpc/assets/images/screenshot.png)
```

**Note:** Replace `screenshot.png` with your actual image filename. Include `/pulserpc/` prefix due to `baseurl` setting.

## Deployment

### GitHub Pages

The documentation is deployed to GitHub Pages via the `gh-pages` branch or GitHub Actions.

#### Manual Deployment

1. **Build the site:**
   ```bash
   cd /workspace/docs
   bundle exec jekyll build
   ```

2. **Deploy to gh-pages branch:**
   ```bash
   # From repository root
   git subtree push --prefix docs/_site origin gh-pages
   ```

#### Automated Deployment (Recommended)

See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Actions workflow configuration.

### Custom Domain

To use a custom domain:

1. Add `CNAME` file to docs directory:
   ```
   docs.yourdomain.com
   ```

2. Update DNS settings with your domain provider

3. Configure domain in GitHub repository settings (Settings > Pages)

## Troubleshooting

### Build Errors

**Problem:** `cannot load such file -- webrick`

**Solution:**
```bash
bundle add webrick
```

**Problem:** Build is slow

**Solution:**
- Use `--profile` flag to identify slow pages
- Reduce number of posts/pages if applicable
- Exclude unnecessary files with `exclude:` in `_config.yml`

### Link Issues

**Problem:** Links don't work on GitHub Pages

**Solution:** Ensure all links use `{{ site.baseurl }}` or include `/pulserpc/` prefix:
```html
<a href="{{ site.baseurl }}/get-started/installation/">Installation</a>
```

Or in Markdown:
```markdown
[Installation](/pulserpc/get-started/installation/)
```

### Search Not Working

**Problem:** Search returns no results

**Solution:**
- Ensure `search_enabled: true` in `_config.yml`
- Rebuild the site after adding new content
- Check browser console for JavaScript errors

### Styles Not Updating

**Problem:** CSS changes don't appear

**Solution:**
- Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
- Stop Jekyll server, delete `_site/` directory, restart
- Ensure SCSS files are imported correctly in `assets/css/custom.scss`

## Maintenance

### Updating Dependencies

Periodically update Ruby gems:

```bash
cd /workspace/docs
bundle update
bundle install
```

### Updating Just the Docs Theme

Check for theme updates:

```bash
bundle update just-the-docs
```

Review the [Just the Docs changelog](https://github.com/just-the-docs/just-the-docs/releases) before updating.

### Link Checking

Regularly check for broken links:

```bash
# Install html-proofer
gem install html-proofer

# Check built site
html-proofer ./_site --disable-external --allow-hash-href
```

## Performance Optimization

### Image Optimization

Optimize images before adding to docs:

```bash
# Install imageoptim (macOS)
brew install imageoptim

# Or use online tools:
# - TinyPNG: https://tinypng.com/
# - Squoosh: https://squoosh.app/
```

### Build Performance

To improve build speed:

1. **Limit drafts and future posts** in `_config.yml`:
   ```yaml
   limit_posts: 10
   ```

2. **Exclude unnecessary files**:
   ```yaml
   exclude:
     - "*.draft.md"
     - vendor
     - node_modules
   ```

3. **Use incremental regeneration** (development only):
   ```bash
   bundle exec jekyll serve --incremental
   ```

## Accessibility

The documentation aims to meet WCAG AA accessibility standards:

- Semantic HTML structure
- Color contrast ratios of 4.5:1 or higher
- Keyboard navigation support
- Screen reader compatible
- Proper heading hierarchy

Test accessibility with:
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)

## Contributing

When contributing documentation:

1. **Follow the style guide:** Use consistent formatting and tone
2. **Test locally:** Build and review changes before committing
3. **Check links:** Ensure all internal and external links work
4. **Add front matter:** Include title, parent, nav_order on all pages
5. **Use callouts:** Highlight important information appropriately
6. **Test accessibility:** Run Lighthouse audit on changed pages

## Additional Resources

- [Just the Docs Documentation](https://just-the-docs.github.io/just-the-docs/)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Theming Guide](/pulserpc/advanced/theming.md) - Customizing appearance
- [Deployment Guide](/pulserpc/DEPLOYMENT.md) - Deployment instructions
- [Callout Syntax](/pulserpc/CALLOUTS.md) - Using callout components

## Support

For issues or questions about the documentation:

1. Check existing [GitHub Issues](https://github.com/coopernurse/pulserpc/issues)
2. Review the [troubleshooting section](#troubleshooting) above
3. Consult [Just the Docs documentation](https://just-the-docs.github.io/just-the-docs/docs/)
4. Open a new issue with the "documentation" label
