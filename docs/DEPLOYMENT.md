# Deployment Guide for Student Results Viewer

## Initial Setup

### 1. Create GitHub Repository

1. Go to GitHub and create a new repository: `4Sighteducation/student-results-viewer`
2. Make it public (required for CDN access via jsdelivr)
3. Don't initialize with README (we already have one)

### 2. Initialize Git Locally

```bash
cd STUDENT-RESULTS-VIEWER
git init
git add .
git commit -m "Initial commit - Student Results Viewer v1.0.0"
git branch -M main
git remote add origin https://github.com/4Sighteducation/student-results-viewer.git
git push -u origin main
```

### 3. Verify CDN Access

After pushing, your files should be accessible via:
- JS: `https://cdn.jsdelivr.net/gh/4Sighteducation/student-results-viewer@main/dist/studentResultsViewer.js`
- CSS: `https://cdn.jsdelivr.net/gh/4Sighteducation/student-results-viewer@main/dist/studentResultsViewer.css`

### 4. Test in Knack

1. Create a new page in Knack with:
   - Scene: `scene_1270`
   - Add a Rich Text view: `view_3214`
   - Add any placeholder text in the rich text

2. The app loader configuration is already added to `WorkingAppLoader1.0_12_08_25.js`

3. Navigate to the page and verify the table loads

## Updates and Versioning

### Making Changes

1. Edit source files in `src/`
2. Update version in `package.json`
3. If using build tools, run `npm run build`
4. Otherwise, manually update `dist/` files

### Deploying Updates

```bash
git add .
git commit -m "Update: [describe changes]"
git push origin main
```

### CDN Cache

- jsdelivr caches files, but you can force refresh by using version tags
- For immediate updates during development, append a query string:
  - `...@main/dist/studentResultsViewer.js?v=1.0.1`

## Production Checklist

- [ ] Set `debugMode: false` in app loader configuration
- [ ] Test with different user roles (Staff Admin, Tutor, etc.)
- [ ] Verify data loads correctly
- [ ] Test all filters and sorting
- [ ] Check mobile responsiveness
- [ ] Test CSV export functionality
- [ ] Verify RAG color coding is correct

## Troubleshooting

### Table Not Loading

1. Check browser console for errors
2. Verify scene/view IDs match configuration
3. Ensure user has appropriate role permissions
4. Check API credentials in shared config

### Data Not Showing

1. Verify field mappings in `fieldMappings.js`
2. Check Object_10 has data for current user's establishment
3. Ensure connection fields are properly set up
4. Check API filters in browser network tab

### Styling Issues

1. Ensure CSS file is loading (check network tab)
2. Check for CSS conflicts with Knack's styles
3. Verify viewport meta tag for mobile

## Support

For issues or questions, contact the development team or check the repository issues page.
