// Homepage code tab functionality with accessibility
(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const tabs = document.querySelectorAll('.code-tab');

    tabs.forEach(function(button) {
      // Click handler for tab switching
      button.addEventListener('click', function() {
        // Remove active class from all tabs and panes
        tabs.forEach(function(t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
          t.setAttribute('tabindex', '-1');
        });

        document.querySelectorAll('.code-pane').forEach(function(p) {
          p.classList.remove('active');
          p.setAttribute('tabindex', '-1');
        });

        // Add active class to clicked tab and corresponding pane
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        button.removeAttribute('tabindex');

        const tabName = button.getAttribute('data-tab');
        const pane = document.getElementById('pane-' + tabName);

        if (pane) {
          pane.classList.add('active');
          pane.removeAttribute('tabindex');
        }
      });

      // Keyboard navigation
      button.addEventListener('keydown', function(e) {
        const tabsArray = Array.from(tabs);
        const currentIndex = tabsArray.indexOf(button);
        let nextIndex;

        switch(e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            nextIndex = currentIndex > 0 ? currentIndex - 1 : tabsArray.length - 1;
            tabsArray[nextIndex].focus();
            tabsArray[nextIndex].click();
            break;
          case 'ArrowRight':
            e.preventDefault();
            nextIndex = currentIndex < tabsArray.length - 1 ? currentIndex + 1 : 0;
            tabsArray[nextIndex].focus();
            tabsArray[nextIndex].click();
            break;
          case 'Home':
            e.preventDefault();
            tabsArray[0].focus();
            tabsArray[0].click();
            break;
          case 'End':
            e.preventDefault();
            tabsArray[tabsArray.length - 1].focus();
            tabsArray[tabsArray.length - 1].click();
            break;
        }
      });
    });
  }
})();
