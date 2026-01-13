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

  // Load pages from Jekyll site
  function loadPages() {
    // Try to load from JSON file first
    fetch('/search.json')
      .then(response => response.json())
      .then(data => {
        pages.length = 0;
        pages.push(...data);
        initIndex();
      })
      .catch(err => {
        console.log('Using fallback page list');
        // Fallback: manually define pages
        pages.push(
          { id: '/get-started/installation.html', title: 'Installation', content: 'Install Barrister CLI using Go, Docker, or from source' },
          { id: '/get-started/quickstart-overview.html', title: 'Quickstart Overview', content: 'Build an e-commerce checkout API with Barrister' },
          { id: '/idl-guide/syntax.html', title: 'IDL Syntax', content: 'Learn the Barrister Interface Definition Language syntax' },
          { id: '/idl-guide/types.html', title: 'IDL Types', content: 'Built-in types, arrays, maps, optional fields' },
          { id: '/idl-guide/validation.html', title: 'Validation', content: 'Runtime validation in Barrister' },
          { id: '/languages/go/quickstart.html', title: 'Go Quickstart', content: 'Build a Barrister service in Go' },
          { id: '/languages/java/quickstart.html', title: 'Java Quickstart', content: 'Build a Barrister service in Java' },
          { id: '/languages/python/quickstart.html', title: 'Python Quickstart', content: 'Build a Barrister service in Python' },
          { id: '/languages/typescript/quickstart.html', title: 'TypeScript Quickstart', content: 'Build a Barrister service in TypeScript' },
          { id: '/languages/csharp/quickstart.html', title: 'C# Quickstart', content: 'Build a Barrister service in C#' }
        );
        initIndex();
      });
  }

  // Perform search
  function performSearch(query) {
    if (!idx || query.length < 2) {
      searchResults.classList.remove('active');
      searchResults.innerHTML = '';
      return;
    }

    const results = idx.search(query);

    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-result">No results found</div>';
    } else {
      searchResults.innerHTML = results.slice(0, 10).map(function(result) {
        const page = pages.find(p => p.id === result.ref);
        if (!page) return '';
        return '<div class="search-result"><a href="' + page.id + '">' + page.title + '</a></div>';
      }).join('');
    }

    searchResults.classList.add('active');
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

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPages);
  } else {
    loadPages();
  }
})();
