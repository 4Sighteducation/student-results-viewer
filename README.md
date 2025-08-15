# Student Results Viewer

A Vue.js-based application for viewing and analyzing VESPA student results in Knack.

## Features

- **Dynamic Role-Based Access**: Automatically detects staff roles and displays relevant students
- **Multi-Role Support**: Staff with multiple roles see all their connected students
- **RAG Color Coding**: Visual indicators for score ranges (1-3 red, 4-5 amber, 6-8 light green, 9-10 dark green)
- **Trend Analysis**: Shows progress between cycles with visual indicators
- **Advanced Filtering**: Sort and filter by name, group, year, faculty, and scores
- **Interactive Charts**: 
  - Hover for individual student progress
  - Click for group analytics and distributions
- **Export Options**: CSV and PDF export functionality
- **Responsive Design**: Mobile-friendly card layout on small screens

## Installation

1. Add to your Knack App Loader configuration
2. Reference the compiled files from CDN
3. Configure for scene_1270, view_3214

## Field Mappings

See `src/config/fieldMappings.js` for complete field configuration from Object_10.

## Development

```bash
# Install dependencies (if using build tools)
npm install

# Build for production
npm run build

# Deploy to CDN
npm run deploy
```

## Version History

- v1.0.0 - Initial release with core table functionality
- v1.1.0 - Added chart visualizations
- v1.2.0 - Enhanced filtering and export features
