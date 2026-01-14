/**
 * Add copy-to-clipboard buttons to code blocks
 * Handles both highlight divs and pre tags
 */
(function() {
  'use strict';

  function addCopyButtons() {
    // Find all code containers - only the outer language divs and standalone pre tags
    // Use a more specific selector to avoid nested highlights
    const codeContainers = document.querySelectorAll(
      'div[class*="language-"][class*="highlighter-rouge"]:not(.highlight), ' +
      'pre:not(.highlight pre)'
    );

    codeContainers.forEach((container) => {
      // Skip if button already exists
      if (container.querySelector('.copy-button')) {
        return;
      }

      // Extract code text
      const codeElement = container.querySelector('code') || container;
      const codeText = codeElement.textContent || '';

      if (!codeText.trim()) {
        return;
      }

      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'code-copy-button-container';

      // Create copy button
      const button = document.createElement('button');
      button.className = 'copy-button';
      button.setAttribute('aria-label', 'Copy code to clipboard');
      button.title = 'Copy to clipboard';
      button.innerHTML = 
        '<svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>' +
        '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>' +
        '</svg>' +
        '<span class="copy-text">Copy</span>';

      button.addEventListener('click', function() {
        // Copy text to clipboard
        navigator.clipboard.writeText(codeText).then(() => {
          // Show success state
          const originalHTML = button.innerHTML;
          button.innerHTML = 
            '<svg class="check-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="20 6 9 17 4 12"></polyline>' +
            '</svg>' +
            '<span class="copy-text">Copied!</span>';
          button.classList.add('copy-success');

          // Reset after 2 seconds
          setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('copy-success');
          }, 2000);
        }).catch((err) => {
          console.error('Failed to copy:', err);
          button.textContent = 'Copy failed';
          setTimeout(() => {
            button.innerHTML = 
              '<svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>' +
              '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>' +
              '</svg>' +
              '<span class="copy-text">Copy</span>';
          }, 1500);
        });
      });

      buttonContainer.appendChild(button);
      container.insertBefore(buttonContainer, container.firstChild);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCopyButtons);
  } else {
    addCopyButtons();
  }
})();
