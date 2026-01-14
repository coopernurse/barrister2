// Mobile Menu and Dropdown Functionality (Task 22)
(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const header = document.querySelector('header');
    const dropdowns = document.querySelectorAll('.dropdown');

    if (!mobileMenuButton || !header) {
      console.warn('Mobile menu elements not found');
      return;
    }

    // Toggle mobile menu
    mobileMenuButton.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleMobileMenu();
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (window.innerWidth <= 950) {
        const headerContent = document.querySelector('.header-content');
        if (headerContent && !headerContent.contains(e.target)) {
          closeMobileMenu();
        }
      } else {
        // Close dropdowns when clicking outside on desktop
        dropdowns.forEach(function(dropdown) {
          if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('dropdown-active');
            const dropdownLink = dropdown.querySelector('a');
            if (dropdownLink) {
              dropdownLink.setAttribute('aria-expanded', 'false');
            }
          }
        });
      }
    });

    // Handle dropdown menus on mobile and desktop
    dropdowns.forEach(function(dropdown) {
      const dropdownLink = dropdown.querySelector('a');
      const dropdownContent = dropdown.querySelector('.dropdown-content');

      if (dropdownLink && dropdownContent) {
        // Click handler for mobile and toggle on desktop
        dropdownLink.addEventListener('click', function(e) {
          if (window.innerWidth <= 950) {
            e.preventDefault();
            e.stopPropagation();

            // Close other dropdowns
            dropdowns.forEach(function(d) {
              if (d !== dropdown) {
                d.classList.remove('dropdown-active');
                const otherLink = d.querySelector('a');
                if (otherLink) {
                  otherLink.setAttribute('aria-expanded', 'false');
                }
              }
            });

            // Toggle current dropdown
            const isActive = dropdown.classList.toggle('dropdown-active');
            dropdownLink.setAttribute('aria-expanded', isActive ? 'true' : 'false');
          }
        });

        // Keyboard support for desktop dropdown
        dropdownLink.addEventListener('keydown', function(e) {
          if (window.innerWidth > 950) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();

              // Close other dropdowns
              dropdowns.forEach(function(d) {
                if (d !== dropdown) {
                  d.classList.remove('dropdown-active');
                  const otherLink = d.querySelector('a');
                  if (otherLink) {
                    otherLink.setAttribute('aria-expanded', 'false');
                  }
                }
              });

              // Toggle current dropdown
              const isActive = dropdown.classList.toggle('dropdown-active');
              dropdownLink.setAttribute('aria-expanded', isActive ? 'true' : 'false');

              // Focus first menu item when opening
              if (isActive) {
                const firstItem = dropdownContent.querySelector('a');
                if (firstItem) {
                  setTimeout(function() {
                    firstItem.focus();
                  }, 100);
                }
              }
            } else if (e.key === 'Escape') {
              e.preventDefault();
              dropdown.classList.remove('dropdown-active');
              dropdownLink.setAttribute('aria-expanded', 'false');
              dropdownLink.focus();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              dropdown.classList.add('dropdown-active');
              dropdownLink.setAttribute('aria-expanded', 'true');
              const firstItem = dropdownContent.querySelector('a');
              if (firstItem) {
                firstItem.focus();
              }
            }
          }
        });

        // Keyboard navigation within dropdown
        const dropdownLinks = dropdownContent.querySelectorAll('a');
        dropdownLinks.forEach(function(link, index) {
          link.addEventListener('keydown', function(e) {
            if (window.innerWidth > 950) {
              if (e.key === 'Escape') {
                e.preventDefault();
                dropdown.classList.remove('dropdown-active');
                dropdownLink.setAttribute('aria-expanded', 'false');
                dropdownLink.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = (index + 1) % dropdownLinks.length;
                dropdownLinks[nextIndex].focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = index === 0 ? dropdownLinks.length - 1 : index - 1;
                dropdownLinks[prevIndex].focus();
              }
            }
          });
        });
      }
    });

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        if (window.innerWidth > 950) {
          // Reset mobile menu state when transitioning to desktop
          closeMobileMenu();
          dropdowns.forEach(function(dropdown) {
            dropdown.classList.remove('dropdown-active');
            const dropdownLink = dropdown.querySelector('a');
            if (dropdownLink) {
              dropdownLink.setAttribute('aria-expanded', 'false');
            }
          });
        }
      }, 250);
    });

    // Handle escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        if (header.classList.contains('mobile-menu-open')) {
          closeMobileMenu();
        } else if (window.innerWidth > 950) {
          // Close all dropdowns on desktop
          dropdowns.forEach(function(dropdown) {
            dropdown.classList.remove('dropdown-active');
            const dropdownLink = dropdown.querySelector('a');
            if (dropdownLink) {
              dropdownLink.setAttribute('aria-expanded', 'false');
            }
          });
        }
      }
    });

    function toggleMobileMenu() {
      const isOpen = header.classList.contains('mobile-menu-open');

      if (isOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    }

    function openMobileMenu() {
      header.classList.add('mobile-menu-open');
      mobileMenuButton.setAttribute('aria-expanded', 'true');

      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';

      // Focus first menu item for accessibility
      const firstNavLink = header.querySelector('nav a');
      if (firstNavLink) {
        setTimeout(function() {
          firstNavLink.focus();
        }, 100);
      }
    }

    function closeMobileMenu() {
      header.classList.remove('mobile-menu-open');
      mobileMenuButton.setAttribute('aria-expanded', 'false');

      // Restore body scroll
      document.body.style.overflow = '';

      // Close all dropdowns
      dropdowns.forEach(function(dropdown) {
        dropdown.classList.remove('dropdown-active');
        const dropdownLink = dropdown.querySelector('a');
        if (dropdownLink) {
          dropdownLink.setAttribute('aria-expanded', 'false');
        }
      });

      // Return focus to menu button
      mobileMenuButton.focus();
    }
  }
})();
