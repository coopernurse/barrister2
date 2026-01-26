#!/bin/bash

# Performance Testing Script for PulseRPC2 Documentation
# This script helps verify performance optimizations

set -e

echo "=================================="
echo "PulseRPC2 Performance Test Script"
echo "=================================="
echo ""

# Check if Jekyll is installed
if ! command -v bundle &> /dev/null; then
    echo "❌ Bundler not found. Please install Ruby and Bundler first."
    exit 1
fi

# Check if Lighthouse CLI is installed
if command -v lighthouse &> /dev/null; then
    LIGHTHOUSE_AVAILABLE=true
    echo "✓ Lighthouse CLI found"
else
    LIGHTHOUSE_AVAILABLE=false
    echo "⚠️  Lighthouse CLI not found. Install with: npm install -g lighthouse"
fi

echo ""
echo "Step 1: Building Jekyll site..."
echo "------------------------------"
cd "$(dirname "$0")"
bundle exec jekyll build --trace

echo ""
echo "Step 2: Starting Jekyll server..."
echo "---------------------------------"
echo "Starting server in background..."
bundle exec jekyll serve --host 0.0.0.0 --port 4000 > /tmp/jekyll.log 2>&1 &
JEKYLL_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Check if server is running
if ! curl -s http://localhost:4000/pulserpc/ > /dev/null; then
    echo "❌ Failed to start Jekyll server. Check /tmp/jekyll.log for details."
    kill $JEKYLL_PID 2>/dev/null || true
    exit 1
fi

echo "✓ Server started successfully"
echo ""

# Run Lighthouse if available
if [ "$LIGHTHOUSE_AVAILABLE" = true ]; then
    echo "Step 3: Running Lighthouse audit..."
    echo "-----------------------------------"
    lighthouse http://localhost:4000/pulserpc/ \
        --only-categories=performance \
        --output=html \
        --output=json \
        --output-path=./lighthouse-report \
        --chrome-flags="--headless" \
        --quiet

    echo ""
    echo "Lighthouse Report Generated:"
    echo "----------------------------"
    if [ -f ./lighthouse-report.report.json ]; then
        SCORE=$(node -e "const data = require('./lighthouse-report.report.json'); console.log(data.categories.performance.score * 100);")
        FCP=$(node -e "const data = require('./lighthouse-report.report.json'); console.log(Math.round(data.audits['first-contentful-paint'].numericValue));")
        LCP=$(node -e "const data = require('./lighthouse-report.report.json'); console.log(Math.round(data.audits['largest-contentful-paint'].numericValue));")
        TBT=$(node -e "const data = require('./lighthouse-report.report.json'); console.log(Math.round(data.audits['total-blocking-time'].numericValue));")
        CLS=$(node -e "const data = require('./lighthouse-report.report.json'); console.log(data.audits['cumulative-layout-shift'].numericValue);")

        echo "Performance Score: $SCORE"
        echo "First Contentful Paint: ${FCP}ms"
        echo "Largest Contentful Paint: ${LCP}ms"
        echo "Total Blocking Time: ${TBT}ms"
        echo "Cumulative Layout Shift: $CLS"

        echo ""
        if [ "$SCORE" -ge 90 ]; then
            echo "✅ EXCELLENT! Performance score: $SCORE/100"
        elif [ "$SCORE" -ge 75 ]; then
            echo "✅ GOOD! Performance score: $SCORE/100"
        elif [ "$SCORE" -ge 50 ]; then
            echo "⚠️  NEEDS IMPROVEMENT. Performance score: $SCORE/100"
        else
            echo "❌ POOR. Performance score: $SCORE/100"
        fi

        echo ""
        echo "Open lighthouse-report.html in your browser for detailed analysis."
    fi
else
    echo "Step 3: Manual Testing Required"
    echo "--------------------------------"
    echo "Open Chrome DevTools and run Lighthouse manually:"
    echo "  1. Navigate to: http://localhost:4000/pulserpc/"
    echo "  2. Open DevTools (F12)"
    echo "  3. Go to Lighthouse tab"
    echo "  4. Run Performance audit"
fi

echo ""
echo "=================================="
echo "Test Complete!"
echo "=================================="
echo ""
echo "Press Ctrl+C to stop the server, or run:"
echo "  kill $JEKYLL_PID"
echo ""
echo "Server running at: http://localhost:4000/pulserpc/"

# Keep script running
wait $JEKYLL_PID
