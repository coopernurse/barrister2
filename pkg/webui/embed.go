package webui

import "embed"

// Embed all webui dist files
// The embed path is relative to this package directory
// Files are copied here during build
//go:embed dist/*
var WebUIFiles embed.FS

