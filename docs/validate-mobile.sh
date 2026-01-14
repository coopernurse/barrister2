#!/bin/bash
# Mobile Responsiveness Validation Script
# Task 22: Validate mobile responsiveness implementation

echo "==================================================="
echo "Mobile Responsiveness Validation"
echo "Task ID: workspace-2is.22"
echo "==================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_passed=0
check_failed=0

check() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
    ((check_passed++))
  else
    echo -e "${RED}✗${NC} $2"
    ((check_failed++))
  fi
}

echo "1. Checking file existence..."
echo "-----------------------------------"

test -f "/workspace/docs/_sass/custom/custom.scss" && check 0 "custom.scss exists" || check 1 "custom.scss missing"
test -f "/workspace/docs/_includes/header.html" && check 0 "header.html exists" || check 1 "header.html missing"
test -f "/workspace/docs/assets/js/mobile-menu.js" && check 0 "mobile-menu.js exists" || check 1 "mobile-menu.js missing"
test -f "/workspace/docs/_layouts/default.html" && check 0 "default.html exists" || check 1 "default.html missing"

echo ""
echo "2. Checking mobile menu button in header..."
echo "-----------------------------------"

grep -q "mobile-menu-button" /workspace/docs/_includes/header.html
check $? "Mobile menu button HTML present"

grep -q "aria-label" /workspace/docs/_includes/header.html
check $? "ARIA label present for accessibility"

grep -q "aria-expanded" /workspace/docs/_includes/header.html
check $? "ARIA expanded state present"

echo ""
echo "3. Checking mobile menu CSS..."
echo "-----------------------------------"

grep -q "\.mobile-menu-button" /workspace/docs/_sass/custom/custom.scss
check $? "Mobile menu button styles present"

grep -q "@media (max-width: 950px)" /workspace/docs/_sass/custom/custom.scss
check $? "Mobile breakpoint at 950px"

grep -q "@media (max-width: 375px)" /workspace/docs/_sass/custom/custom.scss
check $? "Small mobile breakpoint at 375px"

grep -q "min-height: 44px" /workspace/docs/_sass/custom/custom.scss
check $? "WCAG touch target size (44px) specified"

echo ""
echo "4. Checking mobile menu JavaScript..."
echo "-----------------------------------"

grep -q "mobile-menu-button" /workspace/docs/assets/js/mobile-menu.js
check $? "Mobile menu button handler present"

grep -q "aria-expanded" /workspace/docs/assets/js/mobile-menu.js
check $? "ARIA state management present"

grep -q "click" /workspace/docs/assets/js/mobile-menu.js
check $? "Click event handling present"

grep -q "Escape" /workspace/docs/assets/js/mobile-menu.js
check $? "Keyboard (Escape) support present"

grep -q "resize" /workspace/docs/assets/js/mobile-menu.js
check $? "Window resize handling present"

echo ""
echo "5. Checking layout inclusion..."
echo "-----------------------------------"

grep -q "mobile-menu.js" /workspace/docs/_layouts/default.html
check $? "Mobile menu script included in layout"

echo ""
echo "6. Checking responsive breakpoints..."
echo "-----------------------------------"

# Count media queries
media_queries=$(grep -c "@media" /workspace/docs/_sass/custom/custom.scss)
if [ $media_queries -ge 5 ]; then
  check 0 "Multiple responsive breakpoints found ($media_queries queries)"
else
  check 1 "Insufficient responsive breakpoints (found $media_queries)"
fi

echo ""
echo "7. Checking accessibility features..."
echo "-----------------------------------"

grep -q "touch-action" /workspace/docs/_sass/custom/custom.scss
check $? "Touch action optimization present"

grep -q "overflow.*hidden" /workspace/docs/_sass/custom/custom.scss
check $? "Overflow handling present"

grep -q "word-wrap" /workspace/docs/_sass/custom/custom.scss
check $? "Word wrap for text overflow present"

echo ""
echo "8. Checking content readability..."
echo "-----------------------------------"

grep -q "font-size.*16px" /workspace/docs/_sass/custom/custom.scss
check $? "Minimum 16px font size specified"

grep -q "line-height" /workspace/docs/_sass/custom/custom.scss
check $? "Line height optimization present"

grep -q "overflow-x.*auto" /workspace/docs/_sass/custom/custom.scss
check $? "Horizontal scroll for code/tables present"

echo ""
echo "==================================================="
echo "Validation Summary"
echo "==================================================="
echo -e "${GREEN}Passed:${NC} $check_passed"
echo -e "${RED}Failed:${NC} $check_failed"
echo ""

if [ $check_failed -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Open mobile-responsiveness-test.html in a browser"
  echo "2. Resize browser to test viewport sizes: 320px, 375px, 768px, 950px"
  echo "3. Test hamburger menu toggle"
  echo "4. Verify dropdown menus work on mobile"
  echo "5. Check content readability"
  exit 0
else
  echo -e "${RED}✗ Some checks failed. Please review the output above.${NC}"
  exit 1
fi
