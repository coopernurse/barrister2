// Build search index from page data
(function() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  if (!searchInput || !searchResults) return;

  // Page data - will be populated by Jekyll
  const pages = [
    // This will be dynamically populated
  ];

  let idx = null;

  // Initialize Lunr index
  function initIndex() {
    idx = lunr(function() {
      this.ref('id');
      this.field('title', { boost: 10 });
      this.field('content');

      // Build index from pages
      pages.forEach(function(page) {
        this.add(page);
      }, this);
    });
  }

  // Get base URL from body data attribute (set by Jekyll)
  const baseUrl = document.body.dataset.baseurl || '';

  // Load pages from Jekyll site
  function loadPages() {
    // Try to load from JSON file first
    fetch(baseUrl + '/search.json')
      .then(response => response.json())
      .then(data => {
        pages.length = 0;
        pages.push(...data);
        initIndex();
      })
      .catch(err => {
        console.log('Using fallback page list');
        // Fallback: manually define pages with baseUrl
        pages.push(
          { id: baseUrl + '/get-started/installation.html', title: 'Installation', content: 'Install Barrister CLI using Go, Docker, or from source' },
          { id: baseUrl + '/get-started/quickstart-overview.html', title: 'Quickstart Overview', content: 'Build an e-commerce checkout API with Barrister' },
          { id: baseUrl + '/idl-guide/syntax.html', title: 'IDL Syntax', content: 'Learn the Barrister Interface Definition Language syntax' },
          { id: baseUrl + '/idl-guide/types.html', title: 'IDL Types', content: 'Built-in types, arrays, maps, optional fields' },
          { id: baseUrl + '/idl-guide/validation.html', title: 'Validation', content: 'Runtime validation in Barrister' },
          { id: baseUrl + '/languages/go/quickstart.html', title: 'Go Quickstart', content: 'Build a Barrister service in Go' },
          { id: baseUrl + '/languages/java/quickstart.html', title: 'Java Quickstart', content: 'Build a Barrister service in Java' },
          { id: baseUrl + '/languages/python/quickstart.html', title: 'Python Quickstart', content: 'Build a Barrister service in Python' },
          { id: baseUrl + '/languages/typescript/quickstart.html', title: 'TypeScript Quickstart', content: 'Build a Barrister service in TypeScript' },
          { id: baseUrl + '/languages/csharp/quickstart.html', title: 'C# Quickstart', content: 'Build a Barrister service in C#' }
        );
        initIndex();
      });
  }

  // Perform search
  function performSearch(query) {
    if (!idx || query.length < 2) {
      searchResults.classList.remove('active');
      searchResults.innerHTML = '';
      searchInput.setAttribute('aria-expanded', 'false');
      return;
    }

    const results = idx.search(query);

    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-result" role="option">No results found</div>';
    } else {
      searchResults.innerHTML = results.slice(0, 10).map(function(result, index) {
        const page = pages.find(p => p.id === result.ref);
        if (!page) return '';
        return '<div class="search-result" role="option"><a href="' + page.id + '" tabindex="-1">' + page.title + '</a></div>';
      }).join('');
    }

    searchResults.classList.add('active');
    searchInput.setAttribute('aria-expanded', 'true');

    // Announce results to screen readers
    searchResults.setAttribute('aria-live', 'polite');
  }

  // Event listeners
  searchInput.addEventListener('input', function(e) {
    performSearch(e.target.value);
  });

  // Close search results when clicking outside
  document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.remove('active');
    }
  });

  // Keyboard shortcut: Press '/' to focus search input
  document.addEventListener('keydown', function(e) {
    // Only trigger if not typing in an input, textarea, or contenteditable element
    const target = e.target;
    const isTyping = target.tagName === 'INPUT' ||
                     target.tagName === 'TEXTAREA' ||
                     target.isContentEditable;

    // Trigger on '/' key when not already focused on search input
    if (e.key === '/' && !isTyping && document.activeElement !== searchInput) {
      e.preventDefault(); // Prevent '/' from being typed
      searchInput.focus();
    }

    // Close search results on Escape key
    if (e.key === 'Escape' && searchInput && document.activeElement === searchInput) {
      searchInput.blur();
      searchResults.classList.remove('active');
    }
  });

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPages);
  } else {
    loadPages();
  }
})();
