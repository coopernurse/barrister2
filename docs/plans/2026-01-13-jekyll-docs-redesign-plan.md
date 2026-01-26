# Jekyll Documentation Redesign - Implementation Plan

**Date:** 2026-01-13
**Design:** [2026-01-13-jekyll-docs-redesign-design.md](./2026-01-13-jekyll-docs-redesign-design.md)
**Status:** Ready for Implementation

## Overview

Modernize the PulseRPC2 documentation site by implementing the "Just the Docs" Jekyll theme with custom purple/indigo branding, improved typography, sidebar navigation, and a redesigned homepage.

## Tasks

### Phase 1: Setup & Configuration

#### 1. Add Just the Docs Theme
**File:** `docs/Gemfile`
- Add `gem "just-the-docs"` to Gemfile
- Ensure existing gems are compatible
- Expected: Gemfile includes just-the-docs gem

#### 2. Configure Theme in _config.yml
**File:** `docs/_config.yml`
- Set `theme: "just-the-docs"`
- Configure theme settings (search, heading anchors, etc.)
- Set baseurl and other Jekyll settings
- Expected: Theme configured, site builds with `bundle exec jekyll build`

#### 3. Create Navigation Data Structure
**File:** `docs/_data/navigation.yml`
- Define hierarchical navigation structure
- Map all existing pages to new structure
- Include: Home, Get Started, IDL Guide, Language Guides, Examples, Advanced Topics
- Expected: Complete navigation YAML with all current pages

### Phase 2: Custom Styling

#### 4. Create Custom SCSS Overrides
**File:** `docs/_sass/custom/custom.scss`
- Define color variables (primary: #6366f1, surfaces, text colors)
- Override font families (Inter/system-ui for body, JetBrains Mono for code)
- Set sidebar width, border radius, spacing overrides
- Expected: SCSS file with all theme variable overrides

#### 5. Style Code Blocks
**File:** `docs/_sass/custom/custom.scss`
- Dark theme background (#1e293b)
- Purple-based syntax highlighting
- 8px border radius
- Custom copy button styling
- Expected: Code blocks render with dark theme and purple accents

#### 6. Style Homepage Hero Section
**File:** `docs/_sass/custom/custom.scss` + `docs/_layouts/custom/home.html`
- Gradient background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)
- White text with proper contrast
- Responsive padding and spacing
- Expected: Hero section renders with gradient background

#### 7. Style Buttons and Interactive Elements
**File:** `docs/_sass/custom/custom.scss`
- Primary button: solid indigo, white text, 6px radius, shadow
- Secondary button: white with indigo border
- Hover effects: 200ms transitions, 1.02 scale transform
- Expected: Buttons match design spec with smooth animations

#### 8. Style Callouts/Admonitions
**File:** `docs/_sass/custom/custom.scss`
- Note: blue border/icon
- Warning: yellow/amber
- Tip: green
- Important: red
- Expected: Four callout styles with proper icons and colors

#### 9. Add Inter Font (Optional)
**File:** `docs/_includes/custom/head.html`
- Add Google Fonts link for Inter font
- Fallback to system-ui stack
- Expected: Inter font loads on all pages

### Phase 3: Layout & Components

#### 10. Create Custom Homepage Layout
**File:** `docs/_layouts/custom/home.html`
- Hero section with headline, subheadline, CTAs
- Feature highlights grid (6 cards)
- "Quick Look" code example section
- Use Cases section
- Expected: Homepage renders with all hero and feature sections

#### 11. Implement Search Functionality
**File:** `docs/_config.yml` + theme configuration
- Enable Just the Docs built-in search
- Configure search in sidebar
- Add keyboard shortcut (/) documentation
- Expected: Search box appears in sidebar, indexes all content

#### 12. Add Copy Buttons to Code Blocks
**File:** `docs/_includes/custom/head.html` + JavaScript
- Implement copy button functionality
- Add to top-right of all code blocks
- Visual feedback on click
- Expected: Copy button appears on all code blocks, works correctly

#### 13. Implement Table of Contents (Right Column)
**File:** Theme configuration
- Enable "On this page" TOC for right column
- Configure which heading levels to include (H2, H3)
- Sticky positioning on desktop
- Expected: Right column shows TOC, sticks on scroll

### Phase 4: Content Migration

#### 14. Migrate Homepage Content
**File:** `docs/index.md`
- Rewrite with new hero content
- Add feature highlights (6 cards)
- Add "Quick Look" section with code example
- Add use cases section
- Expected: New homepage with all designed sections

#### 15. Reorganize Content Structure
**Files:** All content files in `docs/`
- Reorganize into: get-started/, idl-guide/, languages/, examples/, advanced/
- Update all internal links to new paths
- Ensure no broken links
- Expected: All content moved to new structure, links updated

#### 16. Create Language Guide Subsections
**Files:** `docs/languages/{go,java,python,typescript,csharp}/*.md`
- Ensure each language has: installation.md, quickstart.md, reference.md
- Update navigation.yml to include all language pages
- Expected: All 5 languages have complete subsections

#### 17. Add Front Matter to All Pages
**Files:** All markdown files
- Add title, parent, nav_order to each page
- Ensure proper ordering in navigation
- Expected: All pages have proper Jekyll front matter

#### 18. Update Navigation Links in Header/Footer
**Files:** `docs/_includes/custom/header.html`, `docs/_includes/custom/footer.html`
- Remove old navigation (now in sidebar)
- Update footer with GitHub link, release notes
- Expected: Clean header/footer, navigation moved to sidebar

### Phase 5: Custom Components

#### 19. Create Breadcrumb Component
**File:** `docs/_includes/custom/breadcrumbs.html`
- Display "Home → Section → Page"
- Link each level
- Add to layout above main content
- Expected: Breadcrumbs appear on all non-homepage pages

#### 20. Style Callout Component Usage
**Files:** Content files throughout docs
- Add example callouts where appropriate (notes, warnings, tips)
- Document callout syntax in contribution guide
- Expected: Callouts used strategically in documentation

#### 21. Add "Edit on GitHub" Links (Optional)
**File:** `docs/_includes/custom/footer.html`
- Add link to edit page on GitHub
- Include in page footer
- Expected: "Edit this page on GitHub" link in footer

### Phase 6: Responsive Design & Polish

#### 22. Test Mobile Responsiveness
**Testing:** Manual testing across devices
- Test hamburger menu on mobile
- Verify sidebar slides in/out correctly
- Check all content is readable on small screens
- Expected: Site works well on mobile (320px+)

#### 23. Test Tablet Responsiveness
**Testing:** Manual testing on tablet devices
- Verify sidebar behavior
- Check content width and readability
- Expected: Site works well on tablet (768px+)

#### 24. Cross-Browser Testing
**Testing:** Chrome, Firefox, Safari, Edge
- Test all major features in each browser
- Check rendering consistency
- Expected: Site works correctly across all browsers

#### 25. Performance Optimization
**File:** Various, Lighthouse testing
- Run Lighthouse audit
- Address performance issues (CSS size, font loading, etc.)
- Target: 90+ performance score
- Expected: Lighthouse score 90+ for performance

#### 26. Accessibility Check
**Testing:** Manual + automated tools
- Verify keyboard navigation works
- Check color contrast ratios
- Ensure screen reader compatibility
- Expected: WCAG AA compliant

### Phase 7: Testing & Documentation

#### 27. Verify All Links Work
**Testing:** Automated link checker
- Run link checker (e.g., html-proofer)
- Fix any broken links (internal or external)
- Expected: No broken links in documentation

#### 28. Test Search Functionality
**Testing:** Manual search testing
- Search for common terms (IDL, JSON-RPC, language names)
- Verify results are relevant
- Check keyboard shortcut works
- Expected: Search returns relevant results for common queries

#### 29. Document Customization Guide
**File:** `docs/advanced/theming.md` (new file)
- Document how to customize colors, fonts
- Explain how to add new pages to navigation
- Document callout syntax
- Expected: Guide for future maintainers

#### 30. Update README with Dev Instructions
**File:** `README.md` (root or docs/)
- Add how to run docs locally
- Document build process
- Explain deployment process
- Expected: Clear instructions for contributors

### Phase 8: Deployment

#### 31. Test Local Build
**Command:** `cd docs && bundle exec jekyll build`
- Verify complete build succeeds
- Check for no warnings or errors
- Expected: Clean build with no errors

#### 32. Deploy to GitHub Pages (or equivalent)
**Deployment:** Based on current setup
- Update GitHub Pages settings if needed
- Push to trigger deployment
- Verify deployed site matches local
- Expected: Site deployed successfully, matches local build

#### 33. Post-Deployment Smoke Test
**Testing:** Manual testing on live site
- Check homepage loads
- Navigate through sidebar
- Test search on live site
- Verify code examples render correctly
- Expected: All features work on deployed site

## Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Tasks 4-9 can be done in parallel after Task 2
- Task 10 depends on Tasks 4-6
- Task 11 depends on Task 2
- Task 12 can be done in parallel
- Task 13 depends on Task 2
- Tasks 14-18 depend on Task 3
- Tasks 19-21 depend on Task 3
- Tasks 22-26 depend on all previous phases
- Tasks 27-28 depend on Phase 4 completion
- Tasks 29-30 can be done in parallel during Phase 6
- Tasks 31-33 are final, depend on all previous tasks

## Estimated Complexity

**Medium** - 33 tasks spread across 8 phases with clear dependencies. Most tasks are straightforward configuration and file creation. The main complexity is in content reorganization and ensuring all links remain functional.

## Success Criteria

- Documentation site uses "Just the Docs" theme
- Purple/indigo color scheme applied consistently
- Sidebar navigation with search working correctly
- All existing content migrated and accessible
- Mobile and desktop responsive
- Lighthouse performance score 90+
- No broken links
- Deployed and accessible to users
