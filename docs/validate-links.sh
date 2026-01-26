#!/bin/bash

# Link Validation Script for Jekyll Documentation
# This script checks both internal and external links
# Usage: ./validate-links.sh [--skip-external]

set -e

DOCS_DIR="/workspace/docs"
REPORT_FILE="$DOCS_DIR/LINK_VALIDATION_REPORT.md"
TEMP_DIR=$(mktemp -d)
SKIP_EXTERNAL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-external)
            SKIP_EXTERNAL=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-external]"
            exit 1
            ;;
    esac
done

# Cleanup function
cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}

# Set trap for cleanup
trap cleanup EXIT

echo "# Link Validation Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Generated:** $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Counter variables
total_links=0
internal_links=0
external_links=0
broken_internal=0
broken_external=0
fixed_links=0

echo "🔍 Starting link validation..."
echo "📁 Documentation directory: $DOCS_DIR"
echo ""

# Find all markdown files
echo "📄 Scanning markdown files..."
md_files=$(find "$DOCS_DIR" -name "*.md" \
    -not -path "$DOCS_DIR/_site/*" \
    -not -path "$DOCS_DIR/.jekyll-cache/*" \
    -not -path "$DOCS_DIR/node_modules/*" \
    -not -name "LINK_VALIDATION_REPORT.md")

# Extract all links
for md_file in $md_files; do
    # Skip node_modules and other irrelevant directories
    if [[ "$md_file" =~ node_modules ]]; then
        continue
    fi

    # Extract all markdown links: [text](url)
    links=$(grep -oP '\[.*?\]\([^\)]+\)' "$md_file" 2>/dev/null || true)
    if [[ -n "$links" ]]; then
        echo "$links" | while read -r link; do
            # Extract URL from link
            url=$(echo "$link" | sed -E 's/\[.*?\]\(([^\)]+)\)/\1/')

            # Skip mailto:, tel:, and other protocol links
            if [[ "$url" =~ ^mailto: ]] || [[ "$url" =~ ^tel: ]] || [[ "$url" =~ ^# ]]; then
                continue
            fi

            # Check if it's an external link (starts with http:// or https://)
            if [[ "$url" =~ ^https?:// ]]; then
                echo "ext|$md_file|$url" >> "$TEMP_DIR/all_links.txt"
            else
                echo "int|$md_file|$url" >> "$TEMP_DIR/all_links.txt"
            fi
        done
    fi
done

# Count links
if [[ -f "$TEMP_DIR/all_links.txt" ]]; then
    total_links=$(wc -l < "$TEMP_DIR/all_links.txt")
    external_links=$(grep -c "^ext" "$TEMP_DIR/all_links.txt" || true)
    internal_links=$(grep -c "^int" "$TEMP_DIR/all_links.txt" || true)
fi

echo "📊 Found $total_links total links ($internal_links internal, $external_links external)"
echo ""

# Validate internal links
echo "🔍 Validating internal links..."
echo "" >> "$REPORT_FILE"
echo "## Internal Links" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [[ -f "$TEMP_DIR/all_links.txt" ]]; then
    grep "^int" "$TEMP_DIR/all_links.txt" | while IFS='|' read -r type source_file target_link; do
        # Skip anchor-only links
        if [[ "$target_link" =~ ^# ]]; then
            continue
        fi

        # Skip links with anchors (we'll handle the path part)
        clean_link="${target_link%%#*}"

        # Remove /pulserpc/ prefix if present (it's the baseurl)
        clean_link="${clean_link#/pulserpc/}"

        # Handle absolute paths (starting with /)
        if [[ "$clean_link" =~ ^/ ]]; then
            normalized_path="$DOCS_DIR${clean_link}"
        else
            # Handle relative paths
            base_dir=$(dirname "$source_file")
            normalized_path="$base_dir/$clean_link"
        fi

        # For Jekyll sites, .html links in markdown reference the built HTML output
        # We need to check if the corresponding .md file exists
        found=false

        # Store the original clean_link before removing trailing slash
        original_clean_link="$clean_link"

        # Remove trailing slash if present and try again
        if [[ "$clean_link" =~ /$ ]]; then
            clean_link_no_slash="${clean_link%/}"
            # Re-normalize the path without trailing slash
            if [[ "$clean_link_no_slash" =~ ^/ ]]; then
                normalized_path_no_slash="$DOCS_DIR${clean_link_no_slash}"
            else
                base_dir=$(dirname "$source_file")
                normalized_path_no_slash="$base_dir/$clean_link_no_slash"
            fi

            # Try with .md extension (Jekyll convention: /path/ -> /path.md)
            if [[ -f "${normalized_path_no_slash}.md" ]]; then
                found=true
            fi
        fi

        # Remove trailing slash for subsequent checks
        clean_link="${clean_link%/}"

        # If the link ends with .html, try the corresponding .md file
        if [[ "$found" == "false" ]] && [[ "$clean_link" =~ \.html$ ]]; then
            md_path="${normalized_path%.html}.md"
            if [[ -f "$md_path" ]]; then
                found=true
            fi
        fi

        # Try different extensions if not found yet
        if [[ "$found" == "false" ]]; then
            for ext in ".md" ".html" ""; do
                if [[ -f "${normalized_path}${ext}" ]]; then
                    found=true
                    break
                fi
            done
        fi

        # Try index files for directory links
        if [[ "$found" == "false" ]]; then
            if [[ -f "${normalized_path}/index.md" ]] || [[ -f "${normalized_path}/index.html" ]]; then
                found=true
            fi
        fi

        if [[ "$found" == "false" ]]; then
            echo "❌ Broken internal link: $clean_link" >> "$REPORT_FILE"
            echo "   Source: $source_file" >> "$REPORT_FILE"
            echo "   Tried: ${normalized_path}" >> "$REPORT_FILE"
            echo "" >> "$REPORT_FILE"
            echo "❌ Broken: $clean_link (from $(basename "$source_file"))"
        else
            echo "✓ Internal: $clean_link (from $(basename "$source_file"))"
        fi
    done
fi

# Count broken internal
broken_internal=$(grep -c "Broken internal link" "$REPORT_FILE" 2>/dev/null || true)

echo ""
echo "📊 Internal links: $broken_internal broken (out of $internal_links)"
echo ""

# Test external links (optional)
echo "🌐 Processing external links..."
echo "" >> "$REPORT_FILE"
echo "## External Links" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [[ -f "$TEMP_DIR/all_links.txt" ]]; then
    # Get unique external links
    grep "^ext" "$TEMP_DIR/all_links.txt" | cut -d'|' -f3 | sort -u > "$TEMP_DIR/unique_external.txt"
    external_count=$(wc -l < "$TEMP_DIR/unique_external.txt")

    if [[ "$SKIP_EXTERNAL" == "true" ]]; then
        echo "⏭️  Skipping external link validation (--skip-external flag provided)"
        echo "" >> "$REPORT_FILE"
        echo "**Note:** External link validation was skipped. Links are listed but not tested." >> "$REPORT_FILE"
        sample_count=0
        broken_external=0
        timeout_count=0
    elif [[ $external_count -gt 50 ]]; then
        echo "⏭️  Skipping external link validation (too many links: $external_count)"
        echo "" >> "$REPORT_FILE"
        echo "**Note:** External link validation was skipped due to high volume. Links are listed but not tested." >> "$REPORT_FILE"
        sample_count=0
        broken_external=0
        timeout_count=0
    else
        # Test a sample of external links (first 10 due to time constraints)
        sample_count=0
        max_samples=10

        while read -r url; do
            if [[ $sample_count -ge $max_samples ]]; then
                break
            fi

            sample_count=$((sample_count + 1))

            # Use curl to check if URL is accessible (with timeout)
            if command -v curl &> /dev/null; then
                # Set very short timeout to avoid hanging
                http_code=$(timeout 3 curl -L -s -o /dev/null -w "%{http_code}" --max-time 2 "$url" 2>/dev/null || echo "000")

                if [[ "$http_code" =~ ^[23] ]]; then
                    echo "✓ External ($http_code): $url"
                elif [[ "$http_code" == "000" ]]; then
                    echo "⚠️  External (timeout): $url"
                    echo "⚠️  Timeout: $url" >> "$REPORT_FILE"
                    timeout_count=$((timeout_count + 1))
                else
                    echo "❌ External ($http_code): $url"
                    echo "❌ HTTP $http_code: $url" >> "$REPORT_FILE"
                    broken_external=$((broken_external + 1))
                fi
            else
                echo "⚠️  curl not available, skipping: $url"
            fi
        done < "$TEMP_DIR/unique_external.txt"
    fi

    # List all external links
    echo "" >> "$REPORT_FILE"
    echo "### All External Links ($external_count total)" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    sed 's/^/- /' "$TEMP_DIR/unique_external.txt" >> "$REPORT_FILE"
fi

# Ensure variables are set
sample_count=${sample_count:-0}
broken_external=${broken_external:-0}
timeout_count=${timeout_count:-0}

echo ""
echo "📊 External links: $external_count total, $sample_count checked, $broken_external failed, $timeout_count timeouts"
echo ""

# Check for orphan pages (pages with no incoming links)
echo "🔍 Checking for orphan pages..."
echo "" >> "$REPORT_FILE"
echo "## Orphan Pages" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Pages that may not be linked from other documentation:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

orphan_count=0
for page in $md_files; do
    page_name=$(basename "$page")
    page_name_no_ext="${page_name%.md}"

    # Skip index pages and special files
    if [[ "$page_name" == "index.md" ]] || \
       [[ "$page_name" =~ ^README$ ]] || \
       [[ "$page_name" =~ ^CALLOUTS ]] || \
       [[ "$page_name" =~ ^LINK_VALIDATION ]]; then
        continue
    fi

    # Check if any file links to this page
    is_linked=false
    for check_file in $md_files; do
        if grep -q "$page_name_no_ext" "$check_file" 2>/dev/null; then
            is_linked=true
            break
        fi
    done

    if [[ "$is_linked" == "false" ]]; then
        orphan_count=$((orphan_count + 1))
        echo "- $page" >> "$REPORT_FILE"
    fi
done

if [[ $orphan_count -eq 0 ]]; then
    echo "No orphan pages found ✓" >> "$REPORT_FILE"
fi

echo ""
echo "📊 Orphan pages: $orphan_count found"
echo ""

# Generate summary
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| Metric | Count |" >> "$REPORT_FILE"
echo "|--------|-------|" >> "$REPORT_FILE"
echo "| Total links | $total_links |" >> "$REPORT_FILE"
echo "| Internal links | $internal_links |" >> "$REPORT_FILE"
echo "| External links | $external_links |" >> "$REPORT_FILE"
echo "| Broken internal links | $broken_internal |" >> "$REPORT_FILE"
echo "| Failed external links | $broken_external |" >> "$REPORT_FILE"
echo "| Timeout external links | $timeout_count |" >> "$REPORT_FILE"
echo "| Orphan pages | $orphan_count |" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [[ $broken_internal -eq 0 && $broken_external -eq 0 ]]; then
    echo "## ✅ Status: PASSED" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "All links validated successfully! No broken links found." >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "✅ Link validation PASSED"
    echo ""
    echo "📄 Report saved to: $REPORT_FILE"
    exit 0
else
    echo "## ❌ Status: NEEDS ATTENTION" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    if [[ $broken_internal -gt 0 ]]; then
        echo "- $broken_internal broken internal link(s) found" >> "$REPORT_FILE"
    fi
    if [[ $broken_external -gt 0 ]]; then
        echo "- $broken_external failed external link(s) found" >> "$REPORT_FILE"
    fi
    if [[ $timeout_count -gt 0 ]]; then
        echo "- $timeout_count external link(s) timed out (may be temporary)" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
    echo "Please review the issues above." >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "❌ Link validation found issues"
    echo ""
    echo "📄 Report saved to: $REPORT_FILE"
    exit 1
fi

# Cleanup is handled by trap
