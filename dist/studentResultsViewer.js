/**
 * Student Results Viewer v1.0.0
 * Production build - Combined JavaScript
 * Copyright 2024 4Sight Education Ltd
 */

// Field Mappings Configuration (embedded)
const FIELD_MAPPINGS = {
    objects: {
        vespaResults: 'object_10',
        establishment: 'object_2',
        student: 'object_6',
        staffAdmin: 'object_5',
        tutor: 'object_7',
        headOfYear: 'object_18',
        subjectTeacher: 'object_78'
    },
    connections: {
        establishment: 'field_133',
        staffAdmin: 'field_439',
        tutor: 'field_145',
        headOfYear: 'field_429',
        subjectTeacher: 'field_2191',
        student: 'field_197'  // Corrected to match student email field
    },
    studentInfo: {
        name: 'field_187',
        email: 'field_197',  // Corrected from field_166
        group: 'field_223',
        yearGroup: 'field_144',
        faculty: 'field_782',
        cycle: 'field_146'   // Corrected from field_846
    },
    scores: {
        cycle1: {
            vision: 'field_155',   // V1
            effort: 'field_156',   // E1
            systems: 'field_157',  // S1
            practice: 'field_158', // P1
            attitude: 'field_159', // A1
            overall: 'field_160'   // O1
        },
        cycle2: {
            vision: 'field_161',   // V2
            effort: 'field_162',   // E2
            systems: 'field_163',  // S2
            practice: 'field_164', // P2
            attitude: 'field_165', // A2
            overall: 'field_166'   // O2
        },
        cycle3: {
            vision: 'field_167',   // V3
            effort: 'field_168',   // E3
            systems: 'field_169',  // S3
            practice: 'field_170', // P3
            attitude: 'field_171', // A3
            overall: 'field_172'   // O3
        }
    },
    staffEmails: {
        staffAdmin: 'field_86',
        tutor: 'field_96',
        headOfYear: 'field_417',
        subjectTeacher: 'field_1879'
    }
};

const RAG_CONFIG = {
    red: { min: 1, max: 3, color: '#dc3545', bgColor: '#fee', label: 'Needs Improvement' },
    amber: { min: 4, max: 5, color: '#ffc107', bgColor: '#fff3cd', label: 'Developing' },
    lightGreen: { min: 6, max: 8, color: '#28a745', bgColor: '#d4edda', label: 'Good' },
    darkGreen: { min: 9, max: 10, color: '#155724', bgColor: '#c3e6cb', label: 'Excellent' }
};

function getRagRating(score) {
    if (!score || score === '') return null;
    const numScore = parseInt(score);
    if (isNaN(numScore)) return null;
    
    if (numScore >= RAG_CONFIG.red.min && numScore <= RAG_CONFIG.red.max) return 'red';
    if (numScore >= RAG_CONFIG.amber.min && numScore <= RAG_CONFIG.amber.max) return 'amber';
    if (numScore >= RAG_CONFIG.lightGreen.min && numScore <= RAG_CONFIG.lightGreen.max) return 'lightGreen';
    if (numScore >= RAG_CONFIG.darkGreen.min && numScore <= RAG_CONFIG.darkGreen.max) return 'darkGreen';
    return null;
}

const THEME_CONFIG = {
    colors: {
        vision: '#ff8f00',
        effort: '#86b4f0',
        systems: '#72cb44',
        practice: '#7f31a4',
        attitude: '#f032e6',
        overall: '#2a3c7a'
    },
    vespaLabels: {
        V: 'Vision',
        E: 'Effort',
        S: 'Systems',
        P: 'Practice',
        A: 'Attitude',
        O: 'Overall'
    }
};

// Set global config
window.STUDENT_RESULTS_CONFIG = { FIELD_MAPPINGS, RAG_CONFIG, THEME_CONFIG, getRagRating };

// Main Application
(function() {
    'use strict';

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

    window.initializeStudentResultsViewer = function() {
        console.log('[Student Results Viewer] Initializing...');

        waitForConfig((config) => {
            if (typeof Vue === 'undefined') {
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
        
        const { FIELD_MAPPINGS, RAG_CONFIG, THEME_CONFIG, getRagRating } = window.STUDENT_RESULTS_CONFIG || {};
        const { createApp, ref, computed, onMounted, watch } = Vue;

        const StudentResultsApp = {
            setup() {
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

                const fetchUserInfo = async () => {
                    try {
                        const user = Knack.getUserAttributes();
                        currentUser.value = user;
                        // Get raw roles (object IDs)
                        const rawRoles = Knack.getUserRoles();
                        console.log('[Student Results Viewer] Raw roles:', rawRoles);
                        
                        // Map object IDs to role names
                        const roleMapping = {
                            'object_5': 'Staff Admin',
                            'object_7': 'Tutor',
                            'object_18': 'Head of Year',
                            'object_78': 'Subject Teacher',
                            'object_6': 'Student'
                        };
                        
                        // Convert object IDs to role names
                        userRoles.value = rawRoles.map(r => roleMapping[r]).filter(Boolean);
                        console.log('[Student Results Viewer] User:', user.email, 'Mapped Roles:', userRoles.value);
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

                        const filters = [];
                        
                        // Get record IDs for all user roles
                        let staffRecordIds = {};
                        
                        // Get Tutor record ID
                        if (userRoles.value.includes('Tutor')) {
                            const tutorResponse = await $.ajax({
                                url: `https://api.knack.com/v1/objects/${FIELD_MAPPINGS.objects.tutor}/records`,
                                type: 'GET',
                                headers: {
                                    'X-Knack-Application-Id': config.knackAppId,
                                    'X-Knack-REST-API-Key': config.knackApiKey
                                },
                                data: {
                                    filters: JSON.stringify({
                                        match: 'and',
                                        rules: [{
                                            field: FIELD_MAPPINGS.staffEmails.tutor,
                                            operator: 'is',
                                            value: userEmail
                                        }]
                                    })
                                }
                            });
                            
                            if (tutorResponse.records.length > 0) {
                                staffRecordIds.tutor = tutorResponse.records[0].id;
                                console.log('[Student Results Viewer] Found tutor record ID:', staffRecordIds.tutor);
                            }
                        }
                        
                        // Get Head of Year record ID
                        if (userRoles.value.includes('Head of Year')) {
                            const hoyResponse = await $.ajax({
                                url: `https://api.knack.com/v1/objects/${FIELD_MAPPINGS.objects.headOfYear}/records`,
                                type: 'GET',
                                headers: {
                                    'X-Knack-Application-Id': config.knackAppId,
                                    'X-Knack-REST-API-Key': config.knackApiKey
                                },
                                data: {
                                    filters: JSON.stringify({
                                        match: 'and',
                                        rules: [{
                                            field: FIELD_MAPPINGS.staffEmails.headOfYear,
                                            operator: 'is',
                                            value: userEmail
                                        }]
                                    })
                                }
                            });
                            
                            if (hoyResponse.records.length > 0) {
                                staffRecordIds.headOfYear = hoyResponse.records[0].id;
                                console.log('[Student Results Viewer] Found Head of Year record ID:', staffRecordIds.headOfYear);
                            }
                        }
                        
                        // Get Subject Teacher record ID
                        if (userRoles.value.includes('Subject Teacher')) {
                            const teacherResponse = await $.ajax({
                                url: `https://api.knack.com/v1/objects/${FIELD_MAPPINGS.objects.subjectTeacher}/records`,
                                type: 'GET',
                                headers: {
                                    'X-Knack-Application-Id': config.knackAppId,
                                    'X-Knack-REST-API-Key': config.knackApiKey
                                },
                                data: {
                                    filters: JSON.stringify({
                                        match: 'and',
                                        rules: [{
                                            field: FIELD_MAPPINGS.staffEmails.subjectTeacher,
                                            operator: 'is',
                                            value: userEmail
                                        }]
                                    })
                                }
                            });
                            
                            if (teacherResponse.records.length > 0) {
                                staffRecordIds.subjectTeacher = teacherResponse.records[0].id;
                                console.log('[Student Results Viewer] Found Subject Teacher record ID:', staffRecordIds.subjectTeacher);
                            }
                        }
                        
                        if (userRoles.value.includes('Staff Admin')) {
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
                            const roleFilters = [];
                            
                            if (staffRecordIds.tutor) {
                                roleFilters.push({
                                    field: FIELD_MAPPINGS.connections.tutor,
                                    operator: 'is',
                                    value: staffRecordIds.tutor
                                });
                            }
                            
                            if (staffRecordIds.headOfYear) {
                                roleFilters.push({
                                    field: FIELD_MAPPINGS.connections.headOfYear,
                                    operator: 'is',
                                    value: staffRecordIds.headOfYear
                                });
                            }
                            
                            if (staffRecordIds.subjectTeacher) {
                                roleFilters.push({
                                    field: FIELD_MAPPINGS.connections.subjectTeacher,
                                    operator: 'is',
                                    value: staffRecordIds.subjectTeacher
                                });
                            }
                            
                            if (roleFilters.length > 0) {
                                // If user has multiple roles, use OR to get all their students
                                if (roleFilters.length > 1) {
                                    filters.push({
                                        match: 'or',
                                        rules: roleFilters
                                    });
                                } else {
                                    filters.push(...roleFilters);
                                }
                            }
                        }

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
                    console.log('[Student Results Viewer] Processing', records.length, 'records');
                    
                    // Since each record contains ALL cycles for a student, process differently
                    const students = records.map(record => {
                        const student = {
                            id: record.id,
                            name: record[FIELD_MAPPINGS.studentInfo.name] || '',
                            email: record[FIELD_MAPPINGS.studentInfo.email] || '',
                            group: record[FIELD_MAPPINGS.studentInfo.group] || '',
                            yearGroup: record[FIELD_MAPPINGS.studentInfo.yearGroup] || '',
                            faculty: record[FIELD_MAPPINGS.studentInfo.faculty] || '',
                            cycles: {},
                            roles: detectStudentRoles(record)
                        };
                        
                        // Extract scores for all 3 cycles from the same record
                        // Cycle 1
                        student.cycles[1] = {
                            vision: parseInt(record[FIELD_MAPPINGS.scores.cycle1.vision]) || null,
                            effort: parseInt(record[FIELD_MAPPINGS.scores.cycle1.effort]) || null,
                            systems: parseInt(record[FIELD_MAPPINGS.scores.cycle1.systems]) || null,
                            practice: parseInt(record[FIELD_MAPPINGS.scores.cycle1.practice]) || null,
                            attitude: parseInt(record[FIELD_MAPPINGS.scores.cycle1.attitude]) || null,
                            overall: parseInt(record[FIELD_MAPPINGS.scores.cycle1.overall]) || null
                        };
                        
                        // Cycle 2
                        student.cycles[2] = {
                            vision: parseInt(record[FIELD_MAPPINGS.scores.cycle2.vision]) || null,
                            effort: parseInt(record[FIELD_MAPPINGS.scores.cycle2.effort]) || null,
                            systems: parseInt(record[FIELD_MAPPINGS.scores.cycle2.systems]) || null,
                            practice: parseInt(record[FIELD_MAPPINGS.scores.cycle2.practice]) || null,
                            attitude: parseInt(record[FIELD_MAPPINGS.scores.cycle2.attitude]) || null,
                            overall: parseInt(record[FIELD_MAPPINGS.scores.cycle2.overall]) || null
                        };
                        
                        // Cycle 3
                        student.cycles[3] = {
                            vision: parseInt(record[FIELD_MAPPINGS.scores.cycle3.vision]) || null,
                            effort: parseInt(record[FIELD_MAPPINGS.scores.cycle3.effort]) || null,
                            systems: parseInt(record[FIELD_MAPPINGS.scores.cycle3.systems]) || null,
                            practice: parseInt(record[FIELD_MAPPINGS.scores.cycle3.practice]) || null,
                            attitude: parseInt(record[FIELD_MAPPINGS.scores.cycle3.attitude]) || null,
                            overall: parseInt(record[FIELD_MAPPINGS.scores.cycle3.overall]) || null
                        };
                        
                        // Calculate trends
                        student.trends = calculateTrends(student.cycles);
                        
                        return student;
                    });
                    
                    console.log('[Student Results Viewer] Processed students:', students.length);
                    return students;
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
                    
                    if (selectedRole.value !== 'all') {
                        filtered = filtered.filter(s => s.roles.includes(selectedRole.value));
                    }
                    
                    if (searchQuery.value) {
                        const query = searchQuery.value.toLowerCase();
                        filtered = filtered.filter(s => 
                            s.name?.toLowerCase().includes(query) ||
                            s.email?.toLowerCase().includes(query) ||
                            s.group?.toLowerCase().includes(query)
                        );
                    }
                    
                    if (selectedYearGroup.value !== 'all') {
                        filtered = filtered.filter(s => s.yearGroup === selectedYearGroup.value);
                    }
                    
                    if (selectedFaculty.value !== 'all') {
                        filtered = filtered.filter(s => s.faculty === selectedFaculty.value);
                    }
                    
                    if (selectedGroup.value !== 'all') {
                        filtered = filtered.filter(s => s.group === selectedGroup.value);
                    }
                    
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
                    
                    const headers = ['Name', 'Email', 'Group', 'Year Group', 'Faculty'];
                    for (let cycle = 1; cycle <= 3; cycle++) {
                        ['Vision', 'Effort', 'Systems', 'Practice', 'Attitude', 'Overall'].forEach(dim => {
                            headers.push(`Cycle ${cycle} ${dim}`);
                        });
                    }
                    
                    const rows = filteredStudents.value.map(student => {
                        const row = [
                            student.name || '',
                            student.email || '',
                            student.group || '',
                            student.yearGroup || '',
                            student.faculty || ''
                        ];
                        
                        for (let cycle = 1; cycle <= 3; cycle++) {
                            ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall'].forEach(dim => {
                                row.push(student.cycles[cycle]?.[dim] || '');
                            });
                        }
                        
                        return row;
                    });
                    
                    const csvContent = [headers, ...rows]
                        .map(row => row.map(cell => `"${cell}"`).join(','))
                        .join('\\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `student-results-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                };

                const showStudentProgress = (student) => {
                    selectedStudent.value = student;
                };

                const toggleGroupAnalytics = () => {
                    showGroupAnalytics.value = !showGroupAnalytics.value;
                };

                watch([selectedRole, searchQuery, selectedYearGroup, selectedFaculty, selectedGroup], () => {
                    applyFiltersAndSort();
                });

                onMounted(() => {
                    fetchStudentResults();
                });

                return {
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
                    yearGroups,
                    faculties,
                    groups,
                    availableRoles,
                    handleSort,
                    exportToCSV,
                    showStudentProgress,
                    toggleGroupAnalytics,
                    getRagRating,
                    RAG_CONFIG,
                    THEME_CONFIG
                };
            },
            
            template: `
                <div id="student-results-viewer" class="srv-container">
                    <div v-if="loading" class="srv-loading">
                        <div class="spinner"></div>
                        <p>Loading student results...</p>
                    </div>
                    
                    <div v-else-if="error" class="srv-error">
                        <p>{{ error }}</p>
                        <button @click="fetchStudentResults">Retry</button>
                    </div>
                    
                    <div v-else class="srv-content">
                        <div class="srv-header">
                            <h2>Student VESPA Results</h2>
                            
                            <div class="srv-controls">
                                <div class="srv-control" v-if="availableRoles.length > 1">
                                    <label>View:</label>
                                    <select v-model="selectedRole">
                                        <option v-for="role in availableRoles" :key="role.value" :value="role.value">
                                            {{ role.label }}
                                        </option>
                                    </select>
                                </div>
                                
                                <div class="srv-control">
                                    <input 
                                        type="text" 
                                        v-model="searchQuery" 
                                        placeholder="Search students..."
                                        class="srv-search"
                                    />
                                </div>
                                
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
                        
                        <div class="srv-count">
                            Showing {{ filteredStudents.length }} of {{ students.length }} students
                        </div>
                        
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
                                        
                                        <th colspan="7" class="cycle-header">Cycle 1</th>
                                        <th colspan="7" class="cycle-header">Cycle 2</th>
                                        <th colspan="7" class="cycle-header">Cycle 3</th>
                                    </tr>
                                    <tr>
                                        <th></th>
                                        <th></th>
                                        
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_vision')">V1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_effort')">E1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_systems')">S1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_practice')">P1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_attitude')">A1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_overall')">O1</th>
                                        <th class="trend-header">T</th>
                                        
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_vision')">V2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_effort')">E2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_systems')">S2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_practice')">P2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_attitude')">A2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_overall')">O2</th>
                                        <th class="trend-header">T</th>
                                        
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
                        
                        <div v-if="filteredStudents.length === 0" class="srv-no-results">
                            <p>No students found matching your criteria.</p>
                        </div>
                    </div>
                </div>
            `
        };

        const container = document.querySelector(config.elementSelector);
        if (container) {
            container.innerHTML = '';
            const app = createApp(StudentResultsApp);
            app.mount(container);
            console.log('[Student Results Viewer] App mounted successfully');
        } else {
            console.error('[Student Results Viewer] Container not found:', config.elementSelector);
        }
    }

    if (window.STUDENT_RESULTS_VIEWER_CONFIG) {
        window.initializeStudentResultsViewer();
    }
})();
