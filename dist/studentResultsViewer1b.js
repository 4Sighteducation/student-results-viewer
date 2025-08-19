/**
 * Student Results Viewer v2.0.1
 * Production build with corrected data structure
 * Copyright 2025 4Sight Education Ltd
 * 
 * FIXES APPLIED:
 * - Corrected user profile location (Object_3)
 * - Fixed establishment filtering via Object_3 field_122
 * - Handle many-to-many staff connections (arrays)
 * - Enhanced role detection from field_73
 */

// Debug mode flag - SET TO TRUE FOR TROUBLESHOOTING
const DEBUG_MODE = true;

// Enhanced logging function
function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log('[Student Results Viewer DEBUG]', ...args);
    }
}

// Field Mappings Configuration (embedded)
const FIELD_MAPPINGS = {
    objects: {
        vespaResults: 'object_10',
        establishment: 'object_2',
        userProfile: 'object_3',      // User profile with roles
        staffAdmin: 'object_5',
        student: 'object_6',
        tutor: 'object_7',
        headOfYear: 'object_18',
        subjectTeacher: 'object_78'
    },
    connections: {
        establishment: 'field_133',     // In Object_10
        staffAdmin: 'field_439',        // Array in Object_10
        tutor: 'field_145',            // Array in Object_10
        headOfYear: 'field_429',       // Array in Object_10
        subjectTeacher: 'field_2191',  // Array in Object_10
    },
    userProfile: {
        roles: 'field_73',              // Array of roles in Object_3
        establishment: 'field_122'      // Connected establishment in Object_3
    },
    studentInfo: {
        name: 'field_187',
        email: 'field_197',
        group: 'field_223',
        yearGroup: 'field_144',
        faculty: 'field_782',
        cycle: 'field_146'
    },
    scores: {
        cycle1: {
            vision: 'field_155',
            effort: 'field_156',
            systems: 'field_157',
            practice: 'field_158',
            attitude: 'field_159',
            overall: 'field_160'
        },
        cycle2: {
            vision: 'field_161',
            effort: 'field_162',
            systems: 'field_163',
            practice: 'field_164',
            attitude: 'field_165',
            overall: 'field_166'
        },
        cycle3: {
            vision: 'field_167',
            effort: 'field_168',
            systems: 'field_169',
            practice: 'field_170',
            attitude: 'field_171',
            overall: 'field_172'
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
        console.log('[Student Results Viewer] Initializing v2.0.1...');

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
                        
                        // Get user's profile from Object_3 to get roles
                        const userEmail = user.email;
                        debugLog('Fetching user profile for:', userEmail);
                        
                        const profileResponse = await $.ajax({
                            url: `https://api.knack.com/v1/objects/${FIELD_MAPPINGS.objects.userProfile}/records`,
                            type: 'GET',
                            headers: {
                                'X-Knack-Application-Id': config.knackAppId,
                                'X-Knack-REST-API-Key': config.knackApiKey
                            },
                            data: {
                                filters: JSON.stringify({
                                    match: 'and',
                                    rules: [{
                                        field: 'field_86',  // Email field in Object_3
                                        operator: 'is',
                                        value: userEmail
                                    }]
                                })
                            }
                        });
                        
                        if (profileResponse.records.length > 0) {
                            const profile = profileResponse.records[0];
                            debugLog('User profile found:', profile);
                            
                            // Get roles from field_73
                            const rolesField = profile[FIELD_MAPPINGS.userProfile.roles];
                            debugLog('Roles field (field_73):', rolesField);
                            
                            // Parse roles - could be array or string
                            let rolesList = [];
                            if (Array.isArray(rolesField)) {
                                rolesList = rolesField;
                            } else if (typeof rolesField === 'string') {
                                rolesList = rolesField.split(',').map(r => r.trim());
                            }
                            
                            // Map role values to role names
                            const roleMapping = {
                                'Staff Admin': 'Staff Admin',
                                'Tutor': 'Tutor',
                                'Head of Year': 'Head of Year',
                                'Subject Teacher': 'Subject Teacher',
                                'Student': 'Student'
                            };
                            
                            userRoles.value = rolesList.filter(r => roleMapping[r]).map(r => roleMapping[r]);
                            
                            // Store establishment connection for later use
                            user.establishmentConnection = profile[FIELD_MAPPINGS.userProfile.establishment];
                            user.profileRecord = profile;
                            
                            debugLog('Mapped roles:', userRoles.value);
                            debugLog('Establishment connection:', user.establishmentConnection);
                        }
                        
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

                        let filters = [];
                        let establishmentId = null;
                        
                        // Get record IDs for all user roles
                        let staffRecordIds = {};
                        
                        // Check if Staff Admin and get establishment
                        if (userRoles.value.includes('Staff Admin')) {
                            console.log('[Student Results Viewer] User is Staff Admin, getting establishment from profile...');
                            
                            // Get establishment from user profile (Object_3)
                            if (user.establishmentConnection) {
                                debugLog('Establishment connection from profile:', user.establishmentConnection);
                                
                                // Parse establishment ID
                                if (typeof user.establishmentConnection === 'object' && user.establishmentConnection.id) {
                                    establishmentId = user.establishmentConnection.id;
                                } else if (Array.isArray(user.establishmentConnection) && user.establishmentConnection.length > 0) {
                                    establishmentId = user.establishmentConnection[0].id || user.establishmentConnection[0];
                                } else if (typeof user.establishmentConnection === 'string') {
                                    establishmentId = user.establishmentConnection;
                                }
                                
                                // Try raw field as backup
                                if (!establishmentId && user.profileRecord) {
                                    const rawField = user.profileRecord[FIELD_MAPPINGS.userProfile.establishment + '_raw'];
                                    debugLog('Raw establishment field:', rawField);
                                    if (rawField) {
                                        if (Array.isArray(rawField) && rawField.length > 0) {
                                            establishmentId = rawField[0].id || rawField[0];
                                        } else if (rawField.id) {
                                            establishmentId = rawField.id;
                                        }
                                    }
                                }
                                
                                if (establishmentId) {
                                    console.log('[Student Results Viewer] Found establishment ID:', establishmentId);
                                    filters.push({
                                        field: FIELD_MAPPINGS.connections.establishment,
                                        operator: 'is',
                                        value: establishmentId
                                    });
                                } else {
                                    console.warn('[Student Results Viewer] No establishment found for Staff Admin');
                                }
                            }
                        }
                        
                        // For non-Staff Admin roles or as additional filters
                        if (!establishmentId || userRoles.value.some(r => r !== 'Staff Admin')) {
                            // Get role-specific record IDs
                            const rolePromises = [];
                            
                            // Get Tutor record ID
                            if (userRoles.value.includes('Tutor')) {
                                debugLog('Fetching Tutor record...');
                                rolePromises.push(
                                    $.ajax({
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
                                    }).then(response => {
                                        if (response.records.length > 0) {
                                            staffRecordIds.tutor = response.records[0].id;
                                            console.log('[Student Results Viewer] Found tutor record ID:', staffRecordIds.tutor);
                                        }
                                    }).catch(err => {
                                        console.error('[Student Results Viewer] Error fetching Tutor record:', err);
                                    })
                                );
                            }
                            
                            // Get Head of Year record ID
                            if (userRoles.value.includes('Head of Year')) {
                                debugLog('Fetching Head of Year record...');
                                rolePromises.push(
                                    $.ajax({
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
                                    }).then(response => {
                                        if (response.records.length > 0) {
                                            staffRecordIds.headOfYear = response.records[0].id;
                                            console.log('[Student Results Viewer] Found Head of Year record ID:', staffRecordIds.headOfYear);
                                        }
                                    }).catch(err => {
                                        console.error('[Student Results Viewer] Error fetching Head of Year record:', err);
                                    })
                                );
                            }
                            
                            // Get Subject Teacher record ID
                            if (userRoles.value.includes('Subject Teacher')) {
                                debugLog('Fetching Subject Teacher record...');
                                rolePromises.push(
                                    $.ajax({
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
                                    }).then(response => {
                                        if (response.records.length > 0) {
                                            staffRecordIds.subjectTeacher = response.records[0].id;
                                            console.log('[Student Results Viewer] Found Subject Teacher record ID:', staffRecordIds.subjectTeacher);
                                        }
                                    }).catch(err => {
                                        console.error('[Student Results Viewer] Error fetching Subject Teacher record:', err);
                                    })
                                );
                            }
                            
                            // Wait for all role fetches to complete
                            await Promise.all(rolePromises);
                            
                            // Build role filters for many-to-many connections
                            const roleFilters = [];
                            
                            if (staffRecordIds.tutor) {
                                // Use 'contains' operator for array fields
                                roleFilters.push({
                                    field: FIELD_MAPPINGS.connections.tutor,
                                    operator: 'contains',
                                    value: staffRecordIds.tutor
                                });
                            }
                            
                            if (staffRecordIds.headOfYear) {
                                roleFilters.push({
                                    field: FIELD_MAPPINGS.connections.headOfYear,
                                    operator: 'contains',
                                    value: staffRecordIds.headOfYear
                                });
                            }
                            
                            if (staffRecordIds.subjectTeacher) {
                                roleFilters.push({
                                    field: FIELD_MAPPINGS.connections.subjectTeacher,
                                    operator: 'contains',
                                    value: staffRecordIds.subjectTeacher
                                });
                            }
                            
                            if (roleFilters.length > 0) {
                                // If Staff Admin with establishment, add role filters as OR within establishment
                                if (establishmentId) {
                                    filters.push({
                                        match: 'or',
                                        rules: roleFilters
                                    });
                                } else {
                                    // Non-Staff Admin: use OR to get all their students
                                    if (roleFilters.length > 1) {
                                        filters = [{
                                            match: 'or',
                                            rules: roleFilters
                                        }];
                                    } else {
                                        filters = roleFilters;
                                    }
                                }
                            }
                        }

                        // Fetch ALL pages if needed
                        let allRecords = [];
                        let page = 1;
                        let hasMore = true;
                        const MAX_PAGES = establishmentId ? 20 : 5; // More pages for Staff Admin
                        
                        debugLog('Final filters to be applied:', filters);
                        
                        while (hasMore && page <= MAX_PAGES) {
                            const response = await $.ajax({
                                url: `https://api.knack.com/v1/objects/${FIELD_MAPPINGS.objects.vespaResults}/records`,
                                type: 'GET',
                                headers: {
                                    'X-Knack-Application-Id': config.knackAppId,
                                    'X-Knack-REST-API-Key': config.knackApiKey
                                },
                                data: {
                                    page: page,
                                    rows_per_page: 1000,
                                    filters: filters.length > 0 ? JSON.stringify({
                                        match: 'and',
                                        rules: filters
                                    }) : undefined
                                }
                            });
                            
                            allRecords = allRecords.concat(response.records);
                            console.log(`[Student Results Viewer] Page ${page}: fetched ${response.records.length} records (total: ${allRecords.length})`);
                            
                            // Check if there are more pages
                            hasMore = response.total_pages > page;
                            page++;
                        }

                        console.log(`[Student Results Viewer] Total fetched: ${allRecords.length} student records`);
                        students.value = processStudentData(allRecords);
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
                    if (records.length > 0) {
                        debugLog('Sample record structure:', records[0]);
                    }
                    
                    // Process each record - ALL cycles are in the same record
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
                        const c1Scores = {
                            vision: parseInt(record[FIELD_MAPPINGS.scores.cycle1.vision]) || null,
                            effort: parseInt(record[FIELD_MAPPINGS.scores.cycle1.effort]) || null,
                            systems: parseInt(record[FIELD_MAPPINGS.scores.cycle1.systems]) || null,
                            practice: parseInt(record[FIELD_MAPPINGS.scores.cycle1.practice]) || null,
                            attitude: parseInt(record[FIELD_MAPPINGS.scores.cycle1.attitude]) || null,
                            overall: parseInt(record[FIELD_MAPPINGS.scores.cycle1.overall]) || null
                        };
                        // Only add if there's at least one score
                        if (Object.values(c1Scores).some(v => v !== null)) {
                            student.cycles[1] = c1Scores;
                        }
                        
                        // Cycle 2
                        const c2Scores = {
                            vision: parseInt(record[FIELD_MAPPINGS.scores.cycle2.vision]) || null,
                            effort: parseInt(record[FIELD_MAPPINGS.scores.cycle2.effort]) || null,
                            systems: parseInt(record[FIELD_MAPPINGS.scores.cycle2.systems]) || null,
                            practice: parseInt(record[FIELD_MAPPINGS.scores.cycle2.practice]) || null,
                            attitude: parseInt(record[FIELD_MAPPINGS.scores.cycle2.attitude]) || null,
                            overall: parseInt(record[FIELD_MAPPINGS.scores.cycle2.overall]) || null
                        };
                        if (Object.values(c2Scores).some(v => v !== null)) {
                            student.cycles[2] = c2Scores;
                        }
                        
                        // Cycle 3
                        const c3Scores = {
                            vision: parseInt(record[FIELD_MAPPINGS.scores.cycle3.vision]) || null,
                            effort: parseInt(record[FIELD_MAPPINGS.scores.cycle3.effort]) || null,
                            systems: parseInt(record[FIELD_MAPPINGS.scores.cycle3.systems]) || null,
                            practice: parseInt(record[FIELD_MAPPINGS.scores.cycle3.practice]) || null,
                            attitude: parseInt(record[FIELD_MAPPINGS.scores.cycle3.attitude]) || null,
                            overall: parseInt(record[FIELD_MAPPINGS.scores.cycle3.overall]) || null
                        };
                        if (Object.values(c3Scores).some(v => v !== null)) {
                            student.cycles[3] = c3Scores;
                        }
                        
                        // Calculate trends
                        student.trends = calculateTrends(student.cycles);
                        
                        return student;
                    });
                    
                    console.log('[Student Results Viewer] Processed students:', students.length);
                    return students;
                };

                const detectStudentRoles = (record) => {
                    const roles = [];
                    // These are arrays in Object_10, so just check if they exist
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
                        const values = [];
                        if (cycles[1] && cycles[1][dim] !== null) values.push({ cycle: 1, value: cycles[1][dim] });
                        if (cycles[2] && cycles[2][dim] !== null) values.push({ cycle: 2, value: cycles[2][dim] });
                        if (cycles[3] && cycles[3][dim] !== null) values.push({ cycle: 3, value: cycles[3][dim] });
                        
                        if (values.length >= 2) {
                            const lastValue = values[values.length - 1].value;
                            const prevValue = values[values.length - 2].value;
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
                    
                    // Build headers
                    const headers = ['Name', 'Email', 'Group', 'Year Group', 'Faculty'];
                    
                    // Add cycle headers
                    for (let cycle = 1; cycle <= 3; cycle++) {
                        headers.push(`C${cycle} Vision`, `C${cycle} Effort`, `C${cycle} Systems`, 
                                    `C${cycle} Practice`, `C${cycle} Attitude`, `C${cycle} Overall`);
                    }
                    
                    // Build rows
                    const rows = filteredStudents.value.map(student => {
                        const row = [
                            student.name || '',
                            student.email || '',
                            student.group || '',
                            student.yearGroup || '',
                            student.faculty || ''
                        ];
                        
                        // Add cycle data
                        for (let cycle = 1; cycle <= 3; cycle++) {
                            const cycleData = student.cycles[cycle] || {};
                            row.push(
                                cycleData.vision || '',
                                cycleData.effort || '',
                                cycleData.systems || '',
                                cycleData.practice || '',
                                cycleData.attitude || '',
                                cycleData.overall || ''
                            );
                        }
                        
                        return row;
                    });
                    
                    // Convert to CSV
                    const csvContent = [headers, ...rows]
                        .map(row => row.map(cell => {
                            // Escape quotes and wrap in quotes if contains comma
                            const escaped = String(cell).replace(/"/g, '""');
                            return escaped.includes(',') ? `"${escaped}"` : escaped;
                        }).join(','))
                        .join('\n');
                    
                    // Download
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `vespa-results-${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    console.log('[Student Results Viewer] CSV exported successfully');
                };

                const showStudentProgress = (student) => {
                    selectedStudent.value = student;
                    // TODO: Implement progress chart modal
                    console.log('[Student Results Viewer] Progress charts coming soon for:', student.name);
                    alert(`Progress charts coming soon!\n\nStudent: ${student.name}\nCycles completed: ${Object.keys(student.cycles).length}`);
                };

                const toggleGroupAnalytics = () => {
                    showGroupAnalytics.value = !showGroupAnalytics.value;
                    // TODO: Implement group analytics modal
                    if (showGroupAnalytics.value) {
                        const avgScores = calculateGroupAverages();
                        console.log('[Student Results Viewer] Group analytics:', avgScores);
                        alert(`Group Analytics (Coming Soon!)\n\nTotal Students: ${filteredStudents.value.length}\n\nFeatures to be added:\n- Average scores by dimension\n- Distribution charts\n- Trend analysis\n- Export reports`);
                    }
                };

                const calculateGroupAverages = () => {
                    // TODO: Implement proper group analytics
                    const dimensions = ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall'];
                    const averages = {};
                    
                    for (let cycle = 1; cycle <= 3; cycle++) {
                        averages[`cycle${cycle}`] = {};
                        dimensions.forEach(dim => {
                            const scores = filteredStudents.value
                                .map(s => s.cycles[cycle]?.[dim])
                                .filter(v => v !== null && v !== undefined);
                            
                            if (scores.length > 0) {
                                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                                averages[`cycle${cycle}`][dim] = Math.round(avg * 10) / 10;
                            }
                        });
                    }
                    
                    return averages;
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
                            <span v-if="userRoles.length > 0" class="srv-role-info">
                                ({{ userRoles.join(', ') }})
                            </span>
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
                                        
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_vision')" title="Vision">V1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_effort')" title="Effort">E1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_systems')" title="Systems">S1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_practice')" title="Practice">P1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_attitude')" title="Attitude">A1</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle1_overall')" title="Overall">O1</th>
                                        <th class="trend-header" title="Trend">T</th>
                                        
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_vision')" title="Vision">V2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_effort')" title="Effort">E2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_systems')" title="Systems">S2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_practice')" title="Practice">P2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_attitude')" title="Attitude">A2</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle2_overall')" title="Overall">O2</th>
                                        <th class="trend-header" title="Trend">T</th>
                                        
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_vision')" title="Vision">V3</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_effort')" title="Effort">E3</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_systems')" title="Systems">S3</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_practice')" title="Practice">P3</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_attitude')" title="Attitude">A3</th>
                                        <th class="dimension-header sortable" @click="handleSort('cycle3_overall')" title="Overall">O3</th>
                                        <th class="trend-header" title="Trend">T</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="student in filteredStudents" 
                                        :key="student.id"
                                        @click="showStudentProgress(student)"
                                        @mouseenter="hoveredStudent = student"
                                        @mouseleave="hoveredStudent = null"
                                        class="student-row">
                                        
                                        <td class="student-name" :title="student.email">{{ student.name }}</td>
                                        <td class="student-group">{{ student.group }}</td>
                                        
                                        <!-- Cycle 1 -->
                                        <td v-for="dim in ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall']"
                                            :key="'c1-' + dim"
                                            :class="['score-cell', getRagRating(student.cycles[1]?.[dim]) ? 'rag-' + getRagRating(student.cycles[1]?.[dim]) : '']">
                                            {{ student.cycles[1]?.[dim] || '-' }}
                                        </td>
                                        <td class="trend-cell">
                                            <span v-if="student.trends.overall === 'up'" class="trend-up">↑</span>
                                            <span v-else-if="student.trends.overall === 'down'" class="trend-down">↓</span>
                                            <span v-else-if="student.trends.overall === 'same'" class="trend-same">↔</span>
                                        </td>
                                        
                                        <!-- Cycle 2 -->
                                        <td v-for="dim in ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall']"
                                            :key="'c2-' + dim"
                                            :class="['score-cell', getRagRating(student.cycles[2]?.[dim]) ? 'rag-' + getRagRating(student.cycles[2]?.[dim]) : '']">
                                            {{ student.cycles[2]?.[dim] || '-' }}
                                        </td>
                                        <td class="trend-cell">
                                            <span v-if="student.trends.overall === 'up'" class="trend-up">↑</span>
                                            <span v-else-if="student.trends.overall === 'down'" class="trend-down">↓</span>
                                            <span v-else-if="student.trends.overall === 'same'" class="trend-same">↔</span>
                                        </td>
                                        
                                        <!-- Cycle 3 -->
                                        <td v-for="dim in ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall']"
                                            :key="'c3-' + dim"
                                            :class="['score-cell', getRagRating(student.cycles[3]?.[dim]) ? 'rag-' + getRagRating(student.cycles[3]?.[dim]) : '']">
                                            {{ student.cycles[3]?.[dim] || '-' }}
                                        </td>
                                        <td class="trend-cell">
                                            <span v-if="student.trends.overall === 'up'" class="trend-up">↑</span>
                                            <span v-else-if="student.trends.overall === 'down'" class="trend-down">↓</span>
                                            <span v-else-if="student.trends.overall === 'same'" class="trend-same">↔</span>
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