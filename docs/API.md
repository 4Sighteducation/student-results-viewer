# API Documentation - Student Results Viewer

## Configuration Object

The app expects a global configuration object `STUDENT_RESULTS_VIEWER_CONFIG` with the following structure:

```javascript
{
    knackAppId: 'your-app-id',
    knackApiKey: 'your-api-key',
    appType: 'studentResultsViewer',
    debugMode: false,
    sceneKey: 'scene_1270',
    viewKey: 'view_3214',
    elementSelector: '#view_3214 .kn-rich_text__content',
    renderMode: 'replace'
}
```

## Field Mappings

All field mappings are defined in `src/config/fieldMappings.js`:

### Object References
- `object_10`: VESPA Results
- `object_2`: Establishment
- `object_5`: Staff Admin
- `object_7`: Tutor
- `object_18`: Head of Year
- `object_78`: Subject Teacher

### Key Fields

#### Connection Fields (in Object_10)
- `field_133`: Establishment connection
- `field_439`: Staff Admin connection
- `field_145`: Tutor connection
- `field_429`: Head of Year connection
- `field_2191`: Subject Teacher connection

#### Student Information
- `field_187`: Student Name
- `field_166`: Student Email
- `field_223`: Group
- `field_144`: Year Group
- `field_782`: Faculty
- `field_846`: Cycle

#### Score Fields
See `fieldMappings.js` for complete cycle score mappings.

## Data Flow

### 1. User Authentication
```javascript
Knack.getUserAttributes() // Returns user object
Knack.getUserRoles()      // Returns array of role names
```

### 2. Data Fetching

#### For Staff Admin
- Fetches all students in their establishment
- No additional filtering required

#### For Other Roles
- Filters by role-specific connection fields
- Merges results if user has multiple roles

### 3. API Endpoints

All API calls use Knack's REST API:

```javascript
GET https://api.knack.com/v1/objects/{object_id}/records

Headers:
- X-Knack-Application-Id: {app_id}
- X-Knack-REST-API-Key: {api_key}

Query Parameters:
- page: 1
- rows_per_page: 1000
- filters: JSON stringified filter object
```

### 4. Filter Structure

Example filter for Tutor role:
```javascript
{
    match: 'and',
    rules: [{
        field: 'field_145',
        operator: 'contains',
        value: 'user@email.com'
    }]
}
```

## Vue Component API

### Props
None - the component is self-contained and gets configuration from global variable.

### Data Properties
- `students`: Array of all student records
- `filteredStudents`: Array of filtered/sorted students
- `loading`: Boolean loading state
- `error`: Error message string
- `currentUser`: Current user object
- `userRoles`: Array of user role strings
- `selectedRole`: Currently selected role filter
- `searchQuery`: Search input value
- `sortField`: Current sort field
- `sortDirection`: 'asc' or 'desc'

### Methods

#### `fetchStudentResults()`
Main data fetching method. Handles role detection and API calls.

#### `processStudentData(records)`
Transforms raw Knack records into structured student objects.

#### `applyFiltersAndSort()`
Applies all active filters and sorting to the student list.

#### `handleSort(field)`
Toggles sort direction or changes sort field.

#### `exportToCSV()`
Exports filtered results to CSV file.

#### `showStudentProgress(student)`
Shows detailed progress modal for a student (future enhancement).

#### `toggleGroupAnalytics()`
Shows/hides group analytics modal (future enhancement).

### Events
The component doesn't emit any events but responds to:
- User interactions (clicks, inputs)
- Filter/sort changes via watchers

## Utility Functions

### `getRagRating(score)`
Returns RAG rating string ('red', 'amber', 'lightGreen', 'darkGreen') for a score.

### `calculateTrends(cycles)`
Calculates trend direction ('up', 'down', 'same') between cycles.

### `detectStudentRoles(record)`
Identifies which staff roles are connected to a student record.

## Export Format

CSV export includes:
- Student information (Name, Email, Group, Year Group, Faculty)
- All cycle scores (V, E, S, P, A, O for each cycle)
- Headers use friendly names

## Error Handling

The app handles:
- Missing configuration
- API failures with retry option
- Missing data fields (shows '-' for empty values)
- Invalid scores (non-numeric values)

## Performance Considerations

- Fetches up to 1000 records per API call
- Uses Vue's reactivity for efficient updates
- Implements client-side filtering/sorting
- CSS animations use transforms for better performance
