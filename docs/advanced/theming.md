# Theming Guide

This guide explains how to customize the appearance and behavior of the Barrister2 documentation site.

## Overview

The documentation uses [Just the Docs](https://just-the-docs.github.io/just-the-docs/) as the base theme, with custom overrides for colors, fonts, and styling. All custom styles are defined in SCSS files that can be modified to match your brand.

## Color Customization

### Color Variables

Colors are defined as CSS custom properties (variables) in `/workspace/docs/_sass/custom/custom.scss`. The variables are organized into semantic categories:

```scss
:root {
  // Primary colors (Indigo-based purple theme)
  --color-primary: #6366f1;
  --color-primary-hover: #4f46e5;
  --color-secondary: #8b5cf6;

  // Surface colors (Backgrounds)
  --color-surface-bg: #ffffff;
  --color-surface-secondary: #f8fafc;
  --color-surface-tertiary: #f1f5f9;

  // Text colors (High contrast for accessibility)
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-tertiary: #64748b;

  // Semantic colors
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

### Changing the Color Scheme

To change the color scheme, edit the color variables in `/workspace/docs/_sass/custom/custom.scss`:

```scss
:root {
  // Example: Change to green theme
  --color-primary: #10b981;      // Emerald green
  --color-primary-hover: #059669; // Darker green
  --color-secondary: #34d399;     // Light green
}
```

**Note:** When changing colors, ensure adequate contrast for accessibility (WCAG AA requires 4.5:1 for normal text).

### Syntax Highlighting Colors

Code syntax highlighting is also customized in the same file. The colors use a purple-based palette:

```scss
.highlight {
  .k { color: #c084fc; font-weight: bold } // Keywords
  .s { color: #a5b4fc }                    // Strings
  .nf { color: #60a5fa }                   // Functions
  .m { color: #f472b6 }                    // Numbers
}
```

To customize syntax colors, modify these selectors. See [Rouge syntax highlighting](https://github.com/rouge-ruby/rouge/wiki/List-of-tokens) for available token classes.

## Font Customization

### Font Families

Fonts are defined as CSS variables in `/workspace/docs/_sass/custom/custom.scss`:

```scss
:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-code: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
}
```

### Changing Fonts

1. **For system fonts:** Replace the font stack in `--font-primary`:
   ```scss
   --font-primary: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
   ```

2. **For web fonts:** Add the font import to `/workspace/docs/_includes/custom/head.html` (create if needed):
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="https://fonts.googleapis.com/css2?family=Your+Font&display=swap" rel="stylesheet">
   ```

   Then update the font variable:
   ```scss
   --font-primary: 'Your Font', sans-serif;
   ```

### Font Sizes

Font sizes are controlled by Just the Docs theme settings in `/workspace/docs/_config.yml`:

```yaml
# Not currently overridden, but can be added
# See: https://just-the-docs.github.io/just-the-docs/docs/configuration/
```

To override font sizes, add CSS rules to `/workspace/docs/assets/css/custom.scss`:

```scss
body {
  font-size: 16px; // Default body text
}

h1 {
  font-size: 2.5rem; // Largest heading
}
```

## Layout Customization

### Layout Variables

Key layout dimensions are defined as CSS variables:

```scss
:root {
  --sidebar-width: 280px;
  --header-height: 64px;
  --border-radius: 6px;
  --spacing-md: 16px;  // Base spacing unit
}
```

### Adjusting Sidebar Width

To change the sidebar width, modify the variable:

```scss
--sidebar-width: 320px; // Wider sidebar
```

**Note:** You may need to adjust media queries in the custom SCSS to ensure responsive behavior.

### Spacing Scale

The project uses an 8px base unit spacing scale:

```scss
--spacing-xs: 4px;    // 0.5x
--spacing-sm: 8px;    // 1x
--spacing-md: 16px;   // 2x
--spacing-lg: 24px;   // 3x
--spacing-xl: 32px;   // 4x
--spacing-2xl: 48px;  // 6x
--spacing-3xl: 64px;  // 8x
```

Use these variables consistently for spacing to maintain visual rhythm.

## Component Customization

### Buttons

Button styles are defined in `/workspace/docs/_sass/custom/custom.scss`. The following button classes are available:

- `.btn` - Base button styles
- `.btn-primary` - Primary action button (purple)
- `.btn-secondary` - Secondary action button (white with purple border)
- `.btn-outline` - Outline button (transparent with border)
- `.btn-ghost` - Ghost button (minimal styling)
- `.btn-small`, `.btn-large` - Size variants

**Example usage in Markdown:**

```html
<a href="/get-started/installation/" class="btn btn-primary">
  Get Started
</a>

<a href="/idl-guide/" class="btn btn-secondary">
  View IDL Guide
</a>
```

**Customizing button appearance:**

```scss
// Change button colors
.btn-primary {
  background-color: #your-color;
  border-color: #your-color;
  color: #your-text-color;

  &:hover {
    background-color: #your-hover-color;
  }
}
```

### Callout Boxes

Callouts (alert boxes) are styled components for highlighting important information. See the [Callout Syntax Guide](/CALLOUTS.md) for usage examples.

**Available callout types:**

- `.callout-note` - Blue, for general notes
- `.callout-tip` - Green, for helpful tips
- `.callout-warning` - Yellow/amber, for warnings
- `.callout-important` / `.callout-danger` - Red, for critical information

**Customizing callout colors:**

```scss
.callout-note {
  border-left-color: #your-color;
  background-color: #your-bg-color;

  .callout-icon {
    color: #your-color;
  }

  strong {
    color: #your-title-color;
  }
}
```

### Hero Section

The homepage hero section is styled with `.hero` class:

```scss
.hero {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: var(--color-text-inverse);
  padding: var(--spacing-3xl) var(--spacing-lg);
  border-radius: var(--border-radius-lg);
}
```

**Customizing the hero:**

```scss
// Change gradient
.hero {
  background: linear-gradient(135deg, #your-start-color 0%, #your-end-color 100%);
}

// Adjust padding
.hero {
  padding: 80px 24px;
}
```

## Navigation Customization

### Adding Pages to Navigation

Navigation is configured in `/workspace/docs/_config.yml` using the `nav` structure. Just the Docs uses a simple file-based navigation system.

**To add pages to navigation:**

1. Ensure your page has proper front matter with title and parent:
   ```yaml
   ---
   title: "Page Title"
   parent: "Section Name"
   ---
   ```

2. Organize files in directories that match your navigation structure:
   ```
   docs/
   ├── get-started/
   │   ├── installation.md
   │   └── quickstart.md
   ├── idl-guide/
   │   ├── types.md
   │   └── interfaces.md
   ```

3. The navigation is auto-generated from the file structure. For manual control, see [Just the Docs navigation docs](https://just-the-docs.github.io/just-the-docs/docs/navigation/).

### Reordering Navigation

To control navigation order, add `nav_order` to page front matter:

```yaml
---
title: "Installation"
parent: "Get Started"
nav_order: 1
---
```

### Hiding Pages from Navigation

Add `nav_exclude: true` to page front matter:

```yaml
---
title: "Internal Page"
nav_exclude: true
---
```

## Creating Custom Components

### Step 1: Create CSS

Add your component styles to `/workspace/docs/_sass/custom/custom.scss`:

```scss
// Custom alert banner
.alert-banner {
  background-color: var(--color-warning-bg);
  border-left: 4px solid var(--color-warning);
  padding: var(--spacing-md);
  border-radius: var(--border-radius);
  margin-bottom: var(--spacing-lg);
}
```

### Step 2: Use in Markdown

Apply the class in your Markdown files:

```html
<div class="alert-banner">
  <strong>Notice:</strong> This is a custom alert banner.
</div>
```

## Advanced Customization

### Overriding Just the Docs Defaults

For advanced customization, you can override Just the Docs default styles by adding more specific selectors to your custom SCSS:

```scss
// Override sidebar background
.side-bar {
  background-color: #your-color;
}

// Override main content area
.main-content {
  max-width: 1400px; // Wider content
}
```

### Custom JavaScript

Add custom JavaScript by creating `/workspace/docs/assets/js/custom.js`:

```javascript
// Example: Add smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});
```

Then include it in `/workspace/docs/_includes/custom/head.html`:

```html
<script src="{{ '/assets/js/custom.js' | relative_url }}"></script>
```

### Custom Layouts

To create a custom page layout:

1. Create a new layout file in `/workspace/docs/_layouts/` (e.g., `custom-page.html`)
2. Inherit from the default layout or create a new one
3. Specify the layout in page front matter:
   ```yaml
   ---
   layout: custom-page
   title: "Custom Page"
   ---
   ```

## Theme Switching (Dark Mode)

The current theme setup includes dark mode color variables but does not implement automatic theme switching. To add dark mode support:

### Option 1: System Preference Detection

Add to `/workspace/docs/assets/css/custom.scss`:

```scss
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface-bg: var(--color-surface-bg-dark);
    --color-surface-secondary: var(--color-surface-secondary-dark);
    --color-text-primary: var(--color-text-inverse);
    // Override other variables...
  }
}
```

### Option 2: Manual Toggle

Requires JavaScript to toggle a class on `<body>` and CSS overrides for that class.

## Best Practices

1. **Maintain Accessibility:** Always ensure color contrast ratios meet WCAG AA standards (4.5:1 for text)
2. **Use CSS Variables:** Leverage existing variables for consistency
3. **Test Responsiveness:** Check customizations on mobile (320px+), tablet (768px+), and desktop
4. **Preserve Visual Hierarchy:** Don't override heading sizes inconsistently
5. **Document Changes:** Comment your CSS customizations for future maintainers

## Testing Your Customizations

After making changes:

1. **Build the site:**
   ```bash
   cd /workspace/docs
   bundle exec jekyll build
   ```

2. **Serve locally:**
   ```bash
   bundle exec jekyll serve
   ```

3. **View in browser:**
   Open http://localhost:4000/barrister2/

4. **Test on multiple devices:** Use browser DevTools to test responsive breakpoints

5. **Validate accessibility:** Use tools like:
   - [Lighthouse](https://developers.google.com/web/tools/lighthouse)
   - [axe DevTools](https://www.deque.com/axe/devtools/)
   - [WAVE](https://wave.webaim.org/)

## Further Resources

- [Just the Docs Documentation](https://just-the-docs.github.io/just-the-docs/docs/configuration/)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [SCSS Documentation](https://sass-lang.com/documentation)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
