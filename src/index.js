/**
 * Student Results Viewer - Main Entry Point
 * Vue.js application for displaying VESPA student results in Knack
 */

(function() {
    'use strict';

    // Wait for configuration
    function waitForConfig(callback, maxAttempts = 50) {
        let attempts = 0;
        const checkConfig = setInterval(() => {
            attempts++;
            if (window.STUDENT_RESULTS_VIEWER_CONFIG || attempts >= maxAttempts) {
                clearInterval(checkConfig);
                if (window.STUDENT_RESULTS_VIEWER_CONFIG) {
                    callback(window.STUDENT_RESULTS_VIEWER_CONFIG);
                } else {
                    console.error('[Student Results Viewer] Configuration not found');
                }
            }
        }, 100);
    }

    // Main initialization function
    window.initializeStudentResultsViewer = function() {
        console.log('[Student Results Viewer] Initializing...');

        waitForConfig((config) => {
            // Check if Vue is available
            if (typeof Vue === 'undefined') {
                // Load Vue 3 from CDN if not available
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/vue@3.3.4/dist/vue.global.prod.js';
                script.onload = () => initializeApp(config);
                document.head.appendChild(script);
            } else {
                initializeApp(config);
            }
        });
    };

    function initializeApp(config) {
        console.log('[Student Results Viewer] Vue loaded, initializing app...');
        
        // Import configuration
        const { FIELD_MAPPINGS, RAG_CONFIG, THEME_CONFIG, getRagRating } = window.STUDENT_RESULTS_CONFIG || {};
        
        // Create Vue app
        const { createApp, ref, computed, onMounted, watch } = Vue;

        const StudentResultsApp = {
            setup() {
                // State
                const students = ref([]);
                const filteredStudents = ref([]);
                const loading = ref(true);
                const error = ref(null);
                const currentUser = ref(null);
                const userRoles = ref([]);
                const selectedRole = ref('all');
                const searchQuery = ref('');
                const sortField = ref('name');
                const sortDirection = ref('asc');
                const selectedYearGroup = ref('all');
                const selectedFaculty = ref('all');
                const selectedGroup = ref('all');
                const showGroupAnalytics = ref(false);
                const selectedStudent = ref(null);
                const hoveredStudent = ref(null);

                // Computed properties
                const yearGroups = computed(() => {
                    const groups = [...new Set(students.value.map(s => s.yearGroup))].filter(Boolean);
                    return groups.sort();
                });

                const faculties = computed(() => {
                    const facs = [...new Set(students.value.map(s => s.faculty))].filter(Boolean);
                    return facs.sort();
                });

                const groups = computed(() => {
                    const grps = [...new Set(students.value.map(s => s.group))].filter(Boolean);
                    return grps.sort();
                });

                const availableRoles = computed(() => {
                    const roles = [];
                    if (userRoles.value.includes('Staff Admin')) roles.push({ value: 'staffAdmin', label: 'Staff Admin (All Students)' });
                    if (userRoles.value.includes('Tutor')) roles.push({ value: 'tutor', label: 'Tutor' });
                    if (userRoles.value.includes('Head of Year')) roles.push({ value: 'headOfYear', label: 'Head of Year' });
                    if (userRoles.value.includes('Subject Teacher')) roles.push({ value: 'subjectTeacher', label: 'Subject Teacher' });
                    if (roles.length > 1) roles.unshift({ value: 'all', label: 'All My Students' });
                    return roles;
                });

                // Methods
                const fetchUserInfo = async () => {
                    try {
                        const user = Knack.getUserAttributes();
                        currentUser.value = user;
                        userRoles.value = Knack.getUserRoles();
                        console.log('[Student Results Viewer] User:', user.email, 'Roles:', userRoles.value);
                        return user;
                    } catch (err) {
                        console.error('[Student Results Viewer] Error fetching user info:', err);
                        throw err;
                    }
                };

                const fetchStudentResults = async () => {
                    try {
                        loading.value = true;
                        error.value = null;

                        const user = await fetchUserInfo();
                        const userEmail = user.email;

                        // Build filters based on user roles
                        const filters = [];
                        
                        // First, get the user's establishment
                        if (userRoles.value.includes('Staff Admin')) {
                            // Staff Admin - get all students in their establishment(s)
                            const staffResponse = await $.ajax({
                                url: `https://api.knack.com/v1/objects/${FIELD_MAPPINGS.objects.staffAdmin}/records`,
                                type: 'GET',
                                headers: {
                                    'X-Knack-Application-Id': config.knackAppId,
                                    'X-Knack-REST-API-Key': config.knackApiKey
                                },
                                data: {
                                    filters: JSON.stringify({
                                        match: 'and',
                                        rules: [{
                                            field: FIELD_MAPPINGS.staffEmails.staffAdmin,
                                            operator: 'is',
                                            value: userEmail
                                        }]
                                    })
                                }
                            });

                            if (staffResponse.records.length > 0) {
                                const establishmentId = staffResponse.records[0].field_133_raw?.[0]?.id;
                                if (establishmentId) {
                                    filters.push({
                                        field: FIELD_MAPPINGS.connections.establishment,
                                        operator: 'is',
                                        value: establishmentId
                                    });
                                }
                            }
                        } else {
                            // For other roles, build OR conditions for each role connection
                            const roleFilters = [];
                            
                            if (userRoles.value.includes('Tutor')) {
                                roleFilters.push({
                                    field: FIELD_MAPPINGS.connections.tutor,
                                    operator: 'contains',
                                    value: userEmail
                                });
                            }
                            
                            if (userRoles.value.includes('Head of Year')) {
                                roleFilters.push({
                                    field: FIELD_MAPPINGS.connections.headOfYear,
                                    operator: 'contains',
                                    value: userEmail
                                });
                            }
                            
                            if (userRoles.value.includes('Subject Teacher')) {
                                roleFilters.push({
                                    field: FIELD_MAPPINGS.connections.subjectTeacher,
                                    operator: 'contains',
                                    value: userEmail
                                });
                            }

                            if (roleFilters.length > 0) {
                                filters.push({
                                    match: 'or',
                                    rules: roleFilters
                                });
                            }
                        }

                        // Fetch VESPA results
                        const response = await $.ajax({
                            url: `https://api.knack.com/v1/objects/${FIELD_MAPPINGS.objects.vespaResults}/records`,
                            type: 'GET',
                            headers: {
                                'X-Knack-Application-Id': config.knackAppId,
                                'X-Knack-REST-API-Key': config.knackApiKey
                            },
                            data: {
                                page: 1,
                                rows_per_page: 1000,
                                filters: filters.length > 0 ? JSON.stringify({
                                    match: 'and',
                                    rules: filters
                                }) : undefined
                            }
                        });

                        console.log(`[Student Results Viewer] Fetched ${response.records.length} student records`);
                        
                        // Process and structure the data
                        students.value = processStudentData(response.records);
                        applyFiltersAndSort();

                    } catch (err) {
                        console.error('[Student Results Viewer] Error fetching data:', err);
                        error.value = 'Failed to load student results. Please try again.';
                    } finally {
                        loading.value = false;
                    }
                };

                const processStudentData = (records) => {
                    // Group records by student
                    const studentMap = {};
                    
                    records.forEach(record => {
                        const studentId = record[FIELD_MAPPINGS.studentInfo.email] || record.id;
                        const cycle = record[FIELD_MAPPINGS.studentInfo.cycle];
                        const cycleNum = parseInt(cycle?.replace('Cycle ', '')) || 0;
                        
                        if (!studentMap[studentId]) {
                            studentMap[studentId] = {
                                id: studentId,
                                name: record[FIELD_MAPPINGS.studentInfo.name],
                                email: record[FIELD_MAPPINGS.studentInfo.email],
                                group: record[FIELD_MAPPINGS.studentInfo.group],
                                yearGroup: record[FIELD_MAPPINGS.studentInfo.yearGroup],
                                faculty: record[FIELD_MAPPINGS.studentInfo.faculty],
                                cycles: {},
                                roles: detectStudentRoles(record)
                            };
                        }
                        
                        // Add cycle data
                        if (cycleNum > 0 && cycleNum <= 3) {
                            const cycleKey = `cycle${cycleNum}`;
                            const scoreFields = FIELD_MAPPINGS.scores[cycleKey];
                            
                            studentMap[studentId].cycles[cycleNum] = {
                                vision: parseInt(record[scoreFields.vision]) || null,
                                effort: parseInt(record[scoreFields.effort]) || null,
                                systems: parseInt(record[scoreFields.systems]) || null,
                                practice: parseInt(record[scoreFields.practice]) || null,
                                attitude: parseInt(record[scoreFields.attitude]) || null,
                                overall: parseInt(record[scoreFields.overall]) || null
                            };
                        }
                    });
                    
                    // Calculate trends
                    Object.values(studentMap).forEach(student => {
                        student.trends = calculateTrends(student.cycles);
                    });
                    
                    return Object.values(studentMap);
                };

                const detectStudentRoles = (record) => {
                    const roles = [];
                    if (record[FIELD_MAPPINGS.connections.staffAdmin]) roles.push('staffAdmin');
                    if (record[FIELD_MAPPINGS.connections.tutor]) roles.push('tutor');
                    if (record[FIELD_MAPPINGS.connections.headOfYear]) roles.push('headOfYear');
                    if (record[FIELD_MAPPINGS.connections.subjectTeacher]) roles.push('subjectTeacher');
                    return roles;
                };

                const calculateTrends = (cycles) => {
                    const trends = {};
                    const dimensions = ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall'];
                    
                    dimensions.forEach(dim => {
                        const values = [cycles[1]?.[dim], cycles[2]?.[dim], cycles[3]?.[dim]].filter(v => v !== null);
                        if (values.length >= 2) {
                            const lastValue = values[values.length - 1];
                            const prevValue = values[values.length - 2];
                            if (lastValue > prevValue) trends[dim] = 'up';
                            else if (lastValue < prevValue) trends[dim] = 'down';
                            else trends[dim] = 'same';
                        } else {
                            trends[dim] = null;
                        }
                    });
                    
                    return trends;
                };

                const applyFiltersAndSort = () => {
                    let filtered = [...students.value];
                    
                    // Role filter
                    if (selectedRole.value !== 'all') {
                        filtered = filtered.filter(s => s.roles.includes(selectedRole.value));
                    }
                    
                    // Search filter
                    if (searchQuery.value) {
                        const query = searchQuery.value.toLowerCase();
                        filtered = filtered.filter(s => 
                            s.name?.toLowerCase().includes(query) ||
                            s.email?.toLowerCase().includes(query) ||
                            s.group?.toLowerCase().includes(query)
                        );
                    }
                    
                    // Year group filter
                    if (selectedYearGroup.value !== 'all') {
                        filtered = filtered.filter(s => s.yearGroup === selectedYearGroup.value);
                    }
                    
                    // Faculty filter
                    if (selectedFaculty.value !== 'all') {
                        filtered = filtered.filter(s => s.faculty === selectedFaculty.value);
                    }
                    
                    // Group filter
                    if (selectedGroup.value !== 'all') {
                        filtered = filtered.filter(s => s.group === selectedGroup.value);
                    }
                    
                    // Sort
                    filtered.sort((a, b) => {
                        let aVal, bVal;
                        
                        if (sortField.value === 'name') {
                            aVal = a.name || '';
                            bVal = b.name || '';
                        } else if (sortField.value.includes('cycle')) {
                            const [cycle, dimension] = sortField.value.split('_');
                            const cycleNum = parseInt(cycle.replace('cycle', ''));
                            aVal = a.cycles[cycleNum]?.[dimension] || 0;
                            bVal = b.cycles[cycleNum]?.[dimension] || 0;
                        } else {
                            aVal = a[sortField.value] || '';
                            bVal = b[sortField.value] || '';
                        }
                        
                        if (sortDirection.value === 'asc') {
                            return aVal > bVal ? 1 : -1;
                        } else {
                            return aVal < bVal ? 1 : -1;
                        }
                    });
                    
                    filteredStudents.value = filtered;
                };

                const handleSort = (field) => {
                    if (sortField.value === field) {
                        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
                    } else {
                        sortField.value = field;
                        sortDirection.value = 'asc';
                    }
                    applyFiltersAndSort();
                };

                const exportToCSV = () => {
                    console.log('[Student Results Viewer] Exporting to CSV...');
                    // Implementation for CSV export
                };

                const showStudentProgress = (student) => {
                    selectedStudent.value = student;
                    // Show progress modal/chart
                };

                const toggleGroupAnalytics = () => {
                    showGroupAnalytics.value = !showGroupAnalytics.value;
                };

                // Watchers
                watch([selectedRole, searchQuery, selectedYearGroup, selectedFaculty, selectedGroup], () => {
                    applyFiltersAndSort();
                });

                // Lifecycle
                onMounted(() => {
                    fetchStudentResults();
                });

                return {
                    // State
                    students,
                    filteredStudents,
                    loading,
                    error,
                    currentUser,
                    userRoles,
                    selectedRole,
                    searchQuery,
                    sortField,
                    sortDirection,
                    selectedYearGroup,
                    selectedFaculty,
                    selectedGroup,
                    showGroupAnalytics,
                    selectedStudent,
                    hoveredStudent,
                    
                    // Computed
                    yearGroups,
                    faculties,
                    groups,
                    availableRoles,
                    
                    // Methods
                    handleSort,
                    exportToCSV,
                    showStudentProgress,
                    toggleGroupAnalytics,
                    getRagRating,
                    
                    // Config
                    RAG_CONFIG,
                    THEME_CONFIG
                };
            },
            
            template: `
                <div id="student-results-viewer" class="srv-container">
                    <!-- Loading State -->
                    <div v-if="loading" class="srv-loading">
                        <div class="spinner"></div>
                        <p>Loading student results...</p>
                    </div>
                    
                    <!-- Error State -->
                    <div v-else-if="error" class="srv-error">
                        <p>{{ error }}</p>
                        <button @click="fetchStudentResults">Retry</button>
                    </div>
                    
                    <!-- Main Content -->
                    <div v-else class="srv-content">
                        <!-- Header Controls -->
                        <div class="srv-header">
                            <h2>Student VESPA Results</h2>
                            
                            <div class="srv-controls">
                                <!-- Role Selector -->
                                <div class="srv-control" v-if="availableRoles.length > 1">
                                    <label>View:</label>
                                    <select v-model="selectedRole">
                                        <option v-for="role in availableRoles" :key="role.value" :value="role.value">
                                            {{ role.label }}
                                        </option>
                                    </select>
                                </div>
                                
                                <!-- Search -->
                                <div class="srv-control">
                                    <input 
                                        type="text" 
                                        v-model="searchQuery" 
                                        placeholder="Search students..."
                                        class="srv-search"
                                    />
                                </div>
                                
                                <!-- Filters -->
                                <div class="srv-control">
                                    <select v-model="selectedYearGroup">
                                        <option value="all">All Years</option>
                                        <option v-for="year in yearGroups" :key="year" :value="year">
                                            Year {{ year }}
                                        </option>
                                    </select>
                                </div>
                                
                                <div class="srv-control">
                                    <select v-model="selectedFaculty">
                                        <option value="all">All Faculties</option>
                                        <option v-for="faculty in faculties" :key="faculty" :value="faculty">
                                            {{ faculty }}
                                        </option>
                                    </select>
                                </div>
                                
                                <div class="srv-control">
                                    <select v-model="selectedGroup">
                                        <option value="all">All Groups</option>
                                        <option v-for="group in groups" :key="group" :value="group">
                                            {{ group }}
                                        </option>
                                    </select>
                                </div>
                                
                                <!-- Action Buttons -->
                                <div class="srv-actions">
                                    <button @click="toggleGroupAnalytics" class="btn-analytics">
                                        📊 Group Analytics
                                    </button>
                                    <button @click="exportToCSV" class="btn-export">
                                        📥 Export CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Results Count -->
                        <div class="srv-count">
                            Showing {{ filteredStudents.length }} of {{ students.length }} students
                        </div>
                        
                        <!-- Results Table -->
                        <div class="srv-table-wrapper">
                            <table class="srv-table">
                                <thead>
                                    <tr>
                                        <th @click="handleSort('name')" class="sortable">
                                            Name 
                                            <span class="sort-indicator" v-if="sortField === 'name'">
                                                {{ sortDirection === 'asc' ? '▲' : '▼' }}
                                            </span>
                                        </th>
                                        <th @click="handleSort('group')" class="sortable">
                                            Group
                                            <span class="sort-indicator" v-if="sortField === 'group'">
                                                {{ sortDirection === 'asc' ? '▲' : '▼' }}
                                            </span>
                                        </th>
                                        
                                        <!-- Cycle 1 -->
                                        <th colspan="7" class="cycle-header">Cycle 1</th>
                                        
                                        <!-- Cycle 2 -->
                                        <th colspan="7" class="cycle-header">Cycle 2</th>
                                        
                                        <!-- Cycle 3 -->
                                        <th colspan="7" class="cycle-header">Cycle 3</th>
                                    </tr>
                                    <tr>
                                        <th></th>
                                        <th></th>
                                        
                                        <!-- Cycle 1 Sub-headers -->
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_vision')">V1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_effort')">E1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_systems')">S1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_practice')">P1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_attitude')">A1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_overall')">O1</th>
                                        <th class="trend-header">T</th>
                                        
                                        <!-- Cycle 2 Sub-headers -->
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_vision')">V2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_effort')">E2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_systems')">S2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_practice')">P2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_attitude')">A2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_overall')">O2</th>
                                        <th class="trend-header">T</th>
                                        
                                        <!-- Cycle 3 Sub-headers -->
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_vision')">V3</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_effort')">E3</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_systems')">S3</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_practice')">P3</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_attitude')">A3</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_overall')">O3</th>
                                        <th class="trend-header">T</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="student in filteredStudents" 
                                        :key="student.id"
                                        @click="showStudentProgress(student)"
                                        @mouseenter="hoveredStudent = student"
                                        @mouseleave="hoveredStudent = null"
                                        class="student-row">
                                        
                                        <td class="student-name">{{ student.name }}</td>
                                        <td class="student-group">{{ student.group }}</td>
                                        
                                        <!-- Cycle 1 Scores -->
                                        <td v-for="dim in ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall']"
                                            :key="'c1-' + dim"
                                            :class="['score-cell', getRagRating(student.cycles[1]?.[dim]) ? 'rag-' + getRagRating(student.cycles[1]?.[dim]) : '']">
                                            {{ student.cycles[1]?.[dim] || '-' }}
                                        </td>
                                        <td class="trend-cell">
                                            <span v-if="student.trends.overall && student.cycles[1]" 
                                                  :class="'trend-' + student.trends.overall">
                                                {{ student.trends.overall === 'up' ? '↑' : student.trends.overall === 'down' ? '↓' : '↔' }}
                                            </span>
                                        </td>
                                        
                                        <!-- Cycle 2 Scores -->
                                        <td v-for="dim in ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall']"
                                            :key="'c2-' + dim"
                                            :class="['score-cell', getRagRating(student.cycles[2]?.[dim]) ? 'rag-' + getRagRating(student.cycles[2]?.[dim]) : '']">
                                            {{ student.cycles[2]?.[dim] || '-' }}
                                        </td>
                                        <td class="trend-cell">
                                            <span v-if="student.trends.overall && student.cycles[2]" 
                                                  :class="'trend-' + student.trends.overall">
                                                {{ student.trends.overall === 'up' ? '↑' : student.trends.overall === 'down' ? '↓' : '↔' }}
                                            </span>
                                        </td>
                                        
                                        <!-- Cycle 3 Scores -->
                                        <td v-for="dim in ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall']"
                                            :key="'c3-' + dim"
                                            :class="['score-cell', getRagRating(student.cycles[3]?.[dim]) ? 'rag-' + getRagRating(student.cycles[3]?.[dim]) : '']">
                                            {{ student.cycles[3]?.[dim] || '-' }}
                                        </td>
                                        <td class="trend-cell">
                                            <span v-if="student.trends.overall && student.cycles[3]" 
                                                  :class="'trend-' + student.trends.overall">
                                                {{ student.trends.overall === 'up' ? '↑' : student.trends.overall === 'down' ? '↓' : '↔' }}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- No Results -->
                        <div v-if="filteredStudents.length === 0" class="srv-no-results">
                            <p>No students found matching your criteria.</p>
                        </div>
                    </div>
                </div>
            `
        };

        // Mount the app
        const container = document.querySelector(config.elementSelector);
        if (container) {
            // Clear loading message if present
            container.innerHTML = '';
            
            // Create app and mount
            const app = createApp(StudentResultsApp);
            app.mount(container);
            
            console.log('[Student Results Viewer] App mounted successfully');
        } else {
            console.error('[Student Results Viewer] Container not found:', config.elementSelector);
        }
    }

    // Auto-initialize if config is already present
    if (window.STUDENT_RESULTS_VIEWER_CONFIG) {
        window.initializeStudentResultsViewer();
    }
})();
