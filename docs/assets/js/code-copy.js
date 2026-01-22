/**
 * Add copy-to-clipboard buttons to code blocks
 */
(function() {
  'use strict';

  function addCopyButtons() {
    const codeContainers = document.querySelectorAll('div.highlighter-rouge, figure.highlight, pre:not(div.highlighter-rouge pre):not(figure.highlight pre)');

    codeContainers.forEach((container) => {
      if (container.closest('.code-copy-button-container')) {
        return;
      }

      if (container.querySelector('.code-copy-button-container')) {
        return;
      }

      if (container.tagName === 'PRE' && container.closest('div.highlighter-rouge, figure.highlight')) {
        return;
      }

      const codeElement = container.tagName === 'CODE' ? container : container.querySelector('code');
      const codeText = codeElement ? codeElement.textContent : '';

      if (!codeText || !codeText.trim()) {
        return;
      }

      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'code-copy-button-container';

      const button = document.createElement('button');
      button.className = 'copy-button';
      button.setAttribute('aria-label', 'Copy code to clipboard');
      button.title = 'Copy to clipboard';
      button.innerHTML =
        '<svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>' +
        '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>' +
        '</svg>' +
        '<span class="copy-text">Copy</span>';

      button.addEventListener('click', function() {
        navigator.clipboard.writeText(codeText).then(() => {
          const originalHTML = button.innerHTML;
          button.innerHTML =
            '<svg class="check-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<polyline points="20 6 9 17 4 12"></polyline>' +
              '</svg>' +
              '<span class="copy-text">Copied!</span>';
          button.classList.add('copy-success');

          setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('copy-success');
          }, 2000);
        }).catch((err) => {
          console.error('Failed to copy:', err);
        });
      });

      buttonContainer.appendChild(button);
      container.insertBefore(buttonContainer, container.firstChild);
    });
  }

  function initHighlight() {
    if (typeof hljs !== 'undefined') {
      document.querySelectorAll('pre code').forEach(function(block) {
        hljs.highlightElement(block);
      });
    }
  }

  // Run immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      addCopyButtons();
      initHighlight();
    });
  } else {
    addCopyButtons();
    initHighlight();
  }
})();
