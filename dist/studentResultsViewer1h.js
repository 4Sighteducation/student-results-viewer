/**
 * Student Results Viewer v2.2.1
 * Enhanced with smart filters and improved layout
 * Copyright 2025 4Sight Education Ltd
 * 
 * NEW FEATURES v2.2.1:
 * - Fixed duplicate script loading crash
 * - Fixed establishment filter operator for connection fields
 * - Fixed table height for better visibility
 * - Consistent VESPA theme colors in charts
 * - Smart filters for conditional searches
 * - All column headers are sortable
 */

// Wrap entire script in IIFE with duplicate load protection
(function() {
    'use strict';
    
    // Prevent duplicate script loading
    if (typeof window.STUDENT_RESULTS_VIEWER_LOADED !== 'undefined') {
        console.log('[Student Results Viewer] Script already loaded, skipping duplicate load');
        return;
    }
    window.STUDENT_RESULTS_VIEWER_LOADED = true;

    // Debug mode flag - SET TO FALSE FOR PRODUCTION
    const DEBUG_MODE = false;

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
        email: 'field_70',              // Email field in Object_3
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
// (Already wrapped in outer IIFE, so we don't need another one here)

    // Load Chart.js if not already loaded
    function loadChartJS() {
        return new Promise((resolve) => {
            if (typeof Chart !== 'undefined') {
                resolve();
            } else {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
                script.onload = () => resolve();
                document.head.appendChild(script);
            }
        });
    }

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
        console.log('[Student Results Viewer] Initializing v2.2.1...');

        waitForConfig(async (config) => {
            // Load Chart.js first
            await loadChartJS();
            
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
        console.log('[Student Results Viewer] Vue and Chart.js loaded, initializing app...');
        
        const { FIELD_MAPPINGS, RAG_CONFIG, THEME_CONFIG, getRagRating } = window.STUDENT_RESULTS_CONFIG || {};
        const { createApp, ref, computed, onMounted, watch, nextTick } = Vue;

        // Helper function to parse HTML from Knack fields
        function parseKnackHTML(htmlString) {
            if (!htmlString) return null;
            
            // If it's already not HTML, return as is
            if (typeof htmlString !== 'string' || !htmlString.includes('<')) {
                return htmlString;
            }
            
            // Parse establishment ID from class attribute
            const establishmentMatch = htmlString.match(/class="([^"]*?)"/);
            if (establishmentMatch && establishmentMatch[1]) {
                // Return the ID from the class (first class if multiple)
                const classValue = establishmentMatch[1].split(' ')[0];
                if (classValue && classValue.length > 20) { // Knack IDs are typically 24 chars
                    return classValue;
                }
            }
            
            // Parse text content for roles
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlString;
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            
            // If it contains multiple spans (roles), extract them
            if (htmlString.includes('</span>') && htmlString.includes('<br')) {
                const spans = tempDiv.querySelectorAll('span');
                if (spans.length > 0) {
                    return Array.from(spans).map(span => span.textContent.trim());
                }
            }
            
            return textContent.trim();
        }

        const StudentResultsApp = {
            setup() {
                const students = ref([]);
                const filteredStudents = ref([]);
                const paginatedStudents = ref([]);
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
                const showChartModal = ref(false);
                const chartStudent = ref(null);
                const chartInstance = ref(null);
                const groupChartInstance = ref(null);
                const showSmartFilters = ref(false);
                const smartFilters = ref([]);
                
                // Pagination
                const currentPage = ref(1);
                const pageSize = ref(50);
                const pageSizeOptions = [10, 25, 50, 100, 200, 'All'];

                // Column visibility tracking
                const visibleColumns = ref({});

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

                const totalPages = computed(() => {
                    if (pageSize.value === 'All') return 1;
                    return Math.ceil(filteredStudents.value.length / pageSize.value);
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

                const addSmartFilter = () => {
                    smartFilters.value.push({
                        id: Date.now(),
                        dimension: 'vision',
                        cycle: '1',
                        operator: '>',
                        value: 5
                    });
                };

                const removeSmartFilter = (id) => {
                    smartFilters.value = smartFilters.value.filter(f => f.id !== id);
                    applyFiltersAndSort();
                };

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
                                        field: FIELD_MAPPINGS.userProfile.email,  // Use correct email field (field_70)
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
                            
                            // Parse roles - could be HTML, array or string
                            let rolesList = [];
                            
                            // Parse HTML if needed
                            const parsedRoles = parseKnackHTML(rolesField);
                            debugLog('Parsed roles:', parsedRoles);
                            
                            if (Array.isArray(parsedRoles)) {
                                rolesList = parsedRoles;
                            } else if (typeof parsedRoles === 'string') {
                                // Split by comma if comma-separated
                                rolesList = parsedRoles.split(',').map(r => r.trim());
                            } else if (Array.isArray(rolesField)) {
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
                            
                            // Parse establishment connection
                            const establishmentField = profile[FIELD_MAPPINGS.userProfile.establishment];
                            debugLog('Raw establishment field:', establishmentField);
                            
                            // Parse the establishment ID from HTML if needed
                            const parsedEstablishment = parseKnackHTML(establishmentField);
                            debugLog('Parsed establishment:', parsedEstablishment);
                            
                            user.establishmentConnection = parsedEstablishment;
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
                        
                        // CRITICAL: Get establishment for ALL users (not just Staff Admin)
                        // This is essential with 20K+ records in Object_10
                        console.log('[Student Results Viewer] Getting establishment from user profile...');
                        
                        if (user.establishmentConnection) {
                            debugLog('Establishment connection from profile:', user.establishmentConnection);
                            
                            // The establishment ID should already be parsed
                            establishmentId = user.establishmentConnection;
                            
                            // Additional validation
                            if (typeof establishmentId === 'object' && establishmentId.id) {
                                establishmentId = establishmentId.id;
                            } else if (Array.isArray(establishmentId) && establishmentId.length > 0) {
                                establishmentId = establishmentId[0].id || establishmentId[0];
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
                                // Apply establishment filter for ALL users
                                // Use 'contains' operator for connection fields
                                filters.push({
                                    field: FIELD_MAPPINGS.connections.establishment,
                                    operator: 'contains',  // Fixed: was 'is', now 'contains' for connection fields
                                    value: establishmentId
                                });
                            } else {
                                console.error('[Student Results Viewer] CRITICAL: No establishment found for user - cannot filter 20K+ records!');
                                error.value = 'Unable to determine your establishment. Please contact support.';
                                loading.value = false;
                                return;
                            }
                        } else {
                            console.error('[Student Results Viewer] CRITICAL: No establishment connection in user profile');
                            error.value = 'Unable to determine your establishment. Please contact support.';
                            loading.value = false;
                            return;
                        }
                        
                        // Now add role-specific filters ON TOP of establishment filter
                        // Skip this for Staff Admin as they see all establishment students
                        if (!userRoles.value.includes('Staff Admin') || userRoles.value.length > 1) {
                            // Get role-specific record IDs
                            const rolePromises = [];
                            
                            // Get Tutor record ID
                            if (userRoles.value.includes('Tutor')) {
                                debugLog('Fetching Tutor record...');
                                rolePromises.push(
                                    new Promise((resolve) => {
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
                                        }).done(response => {
                                            if (response.records.length > 0) {
                                                staffRecordIds.tutor = response.records[0].id;
                                                console.log('[Student Results Viewer] Found tutor record ID:', staffRecordIds.tutor);
                                            }
                                            resolve();
                                        }).fail(err => {
                                            console.error('[Student Results Viewer] Error fetching Tutor record:', err);
                                            resolve();
                                        });
                                    })
                                );
                            }
                            
                            // Get Head of Year record ID
                            if (userRoles.value.includes('Head of Year')) {
                                debugLog('Fetching Head of Year record...');
                                rolePromises.push(
                                    new Promise((resolve) => {
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
                                        }).done(response => {
                                            if (response.records.length > 0) {
                                                staffRecordIds.headOfYear = response.records[0].id;
                                                console.log('[Student Results Viewer] Found Head of Year record ID:', staffRecordIds.headOfYear);
                                            }
                                            resolve();
                                        }).fail(err => {
                                            console.error('[Student Results Viewer] Error fetching Head of Year record:', err);
                                            resolve();
                                        });
                                    })
                                );
                            }
                            
                            // Get Subject Teacher record ID
                            if (userRoles.value.includes('Subject Teacher')) {
                                debugLog('Fetching Subject Teacher record...');
                                rolePromises.push(
                                    new Promise((resolve) => {
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
                                        }).done(response => {
                                            if (response.records.length > 0) {
                                                staffRecordIds.subjectTeacher = response.records[0].id;
                                                console.log('[Student Results Viewer] Found Subject Teacher record ID:', staffRecordIds.subjectTeacher);
                                            }
                                            resolve();
                                        }).fail(err => {
                                            console.error('[Student Results Viewer] Error fetching Subject Teacher record:', err);
                                            resolve();
                                        });
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
                                // Add role filters as additional constraints
                                // The establishment filter is already in place, now add role filters
                                // Multiple role filters should be OR'd together (user can be Tutor OR Head of Year)
                                if (roleFilters.length > 1) {
                                    filters.push({
                                        match: 'or',
                                        rules: roleFilters
                                    });
                                } else {
                                    // Single role filter - add directly
                                    filters.push(roleFilters[0]);
                                }
                            } else if (!userRoles.value.includes('Staff Admin')) {
                                // Non-Staff Admin user with no matching role records found
                                console.warn('[Student Results Viewer] No matching staff records found for user roles');
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
                        updateColumnVisibility();

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

                const updateColumnVisibility = () => {
                    const dimensions = ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall'];
                    const newVisibility = {};
                    
                    dimensions.forEach(dim => {
                        // Check each cycle for this dimension
                        for (let cycle = 1; cycle <= 3; cycle++) {
                            const key = `${dim}_${cycle}`;
                            newVisibility[key] = filteredStudents.value.some(s => 
                                s.cycles[cycle] && s.cycles[cycle][dim] !== null
                            );
                        }
                        // Check if trend column should be visible (if any cycle has data)
                        newVisibility[`${dim}_trend`] = newVisibility[`${dim}_1`] || 
                                                       newVisibility[`${dim}_2`] || 
                                                       newVisibility[`${dim}_3`];
                    });
                    
                    visibleColumns.value = newVisibility;
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

                    // Apply smart filters
                    smartFilters.value.forEach(filter => {
                        const cycleNum = parseInt(filter.cycle);
                        const value = parseFloat(filter.value);
                        
                        filtered = filtered.filter(student => {
                            const score = student.cycles[cycleNum]?.[filter.dimension];
                            if (score === null || score === undefined) return false;
                            
                            switch(filter.operator) {
                                case '>': return score > value;
                                case '>=': return score >= value;
                                case '<': return score < value;
                                case '<=': return score <= value;
                                case '=': return score === value;
                                default: return true;
                            }
                        });
                    });
                    
                    filtered.sort((a, b) => {
                        let aVal, bVal;
                        
                        if (sortField.value === 'name') {
                            aVal = a.name || '';
                            bVal = b.name || '';
                        } else if (sortField.value.includes('_')) {
                            // Format: dimension_cycle (e.g., vision_1)
                            const [dimension, cycle] = sortField.value.split('_');
                            const cycleNum = parseInt(cycle);
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
                    updatePagination();
                    updateColumnVisibility();
                };

                const updatePagination = () => {
                    if (pageSize.value === 'All') {
                        paginatedStudents.value = filteredStudents.value;
                    } else {
                        const start = (currentPage.value - 1) * pageSize.value;
                        const end = start + parseInt(pageSize.value);
                        paginatedStudents.value = filteredStudents.value.slice(start, end);
                    }
                };

                const handlePageSizeChange = () => {
                    currentPage.value = 1;
                    updatePagination();
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

                const showStudentChart = (student) => {
                    chartStudent.value = student;
                    showChartModal.value = true;
                    
                    nextTick(() => {
                        createStudentChart(student);
                    });
                };

                const createStudentChart = (student) => {
                    const canvas = document.getElementById('studentChart');
                    if (!canvas) return;
                    
                    // Destroy existing chart if any
                    if (chartInstance.value) {
                        chartInstance.value.destroy();
                    }
                    
                    const dimensions = ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall'];
                    const datasets = [];
                    const labels = dimensions.map(d => THEME_CONFIG.vespaLabels[d.charAt(0).toUpperCase()] || d);
                    
                    // Create dataset for each cycle with VESPA colors
                    for (let cycle = 1; cycle <= 3; cycle++) {
                        if (student.cycles[cycle]) {
                            const data = dimensions.map(d => student.cycles[cycle][d] || 0);
                            datasets.push({
                                label: `Cycle ${cycle}`,
                                data: data,
                                backgroundColor: dimensions.map(d => {
                                    const alpha = cycle === 1 ? 0.3 : cycle === 2 ? 0.5 : 0.7;
                                    const color = THEME_CONFIG.colors[d];
                                    // Convert hex to rgba
                                    const r = parseInt(color.slice(1, 3), 16);
                                    const g = parseInt(color.slice(3, 5), 16);
                                    const b = parseInt(color.slice(5, 7), 16);
                                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                                }),
                                borderColor: dimensions.map(d => THEME_CONFIG.colors[d]),
                                borderWidth: 2
                            });
                        }
                    }
                    
                    chartInstance.value = new Chart(canvas, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: datasets
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'top',
                                },
                                title: {
                                    display: true,
                                    text: `${student.name} - VESPA Progress`
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    max: 10,
                                    ticks: {
                                        stepSize: 1
                                    }
                                }
                            }
                        }
                    });
                };

                const toggleGroupAnalytics = () => {
                    showGroupAnalytics.value = !showGroupAnalytics.value;
                    
                    if (showGroupAnalytics.value) {
                        nextTick(() => {
                            createGroupAnalyticsChart();
                        });
                    }
                };

                const createGroupAnalyticsChart = () => {
                    const canvas = document.getElementById('groupChart');
                    if (!canvas) return;
                    
                    // Destroy existing chart if any
                    if (groupChartInstance.value) {
                        groupChartInstance.value.destroy();
                    }
                    
                    const dimensions = ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall'];
                    const labels = dimensions.map(d => THEME_CONFIG.vespaLabels[d.charAt(0).toUpperCase()] || d);
                    const datasets = [];
                    
                    // Calculate averages for each cycle
                    for (let cycle = 1; cycle <= 3; cycle++) {
                        const averages = dimensions.map(dim => {
                            const scores = filteredStudents.value
                                .map(s => s.cycles[cycle]?.[dim])
                                .filter(v => v !== null && v !== undefined);
                            
                            if (scores.length > 0) {
                                return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
                            }
                            return 0;
                        });
                        
                        if (averages.some(v => v > 0)) {
                            // Use VESPA colors for the radar chart
                            const alpha = cycle === 1 ? 0.2 : cycle === 2 ? 0.3 : 0.4;
                            datasets.push({
                                label: `Cycle ${cycle} Average`,
                                data: averages,
                                backgroundColor: `rgba(102, 126, 234, ${alpha})`,
                                borderColor: cycle === 1 ? '#ff8f00' : 
                                           cycle === 2 ? '#86b4f0' : 
                                           '#72cb44',
                                borderWidth: 2,
                                pointBackgroundColor: dimensions.map(d => THEME_CONFIG.colors[d]),
                                pointBorderColor: '#fff',
                                pointHoverBackgroundColor: '#fff',
                                pointHoverBorderColor: dimensions.map(d => THEME_CONFIG.colors[d])
                            });
                        }
                    }
                    
                    groupChartInstance.value = new Chart(canvas, {
                        type: 'radar',
                        data: {
                            labels: labels,
                            datasets: datasets
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'top',
                                },
                                title: {
                                    display: true,
                                    text: `Group Average Scores (${filteredStudents.value.length} students)`
                                }
                            },
                            scales: {
                                r: {
                                    beginAtZero: true,
                                    max: 10,
                                    ticks: {
                                        stepSize: 2
                                    }
                                }
                            }
                        }
                    });
                };

                const exportToCSV = () => {
                    console.log('[Student Results Viewer] Exporting to CSV...');
                    
                    // Helper to strip HTML from email addresses
                    const stripEmailHTML = (email) => {
                        if (!email) return '';
                        
                        // If it's already plain text, return as is
                        if (!email.includes('<')) return email;
                        
                        // Extract email from HTML anchor tag
                        const match = email.match(/mailto:([^"]+)"/);
                        if (match && match[1]) {
                            return match[1];
                        }
                        
                        // Fallback: parse as HTML and get text content
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = email;
                        return tempDiv.textContent || tempDiv.innerText || email;
                    };
                    
                    // Build headers
                    const headers = ['Name', 'Email', 'Group', 'Year Group', 'Faculty'];
                    const dimensions = ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall'];
                    
                    // Add headers in new order: V1,V2,V3, E1,E2,E3, etc.
                    dimensions.forEach(dim => {
                        const label = dim.charAt(0).toUpperCase();
                        for (let cycle = 1; cycle <= 3; cycle++) {
                            headers.push(`${label}${cycle}`);
                        }
                    });
                    
                    // Build rows
                    const rows = filteredStudents.value.map(student => {
                        const row = [
                            student.name || '',
                            stripEmailHTML(student.email) || '',  // Strip HTML from email
                            student.group || '',
                            student.yearGroup || '',
                            student.faculty || ''
                        ];
                        
                        // Add scores in new order
                        dimensions.forEach(dim => {
                            for (let cycle = 1; cycle <= 3; cycle++) {
                                row.push(student.cycles[cycle]?.[dim] || '');
                            }
                        });
                        
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

                watch([selectedRole, searchQuery, selectedYearGroup, selectedFaculty, selectedGroup], () => {
                    currentPage.value = 1;
                    applyFiltersAndSort();
                });

                watch(smartFilters, () => {
                    currentPage.value = 1;
                    applyFiltersAndSort();
                }, { deep: true });

                watch([currentPage, pageSize], () => {
                    updatePagination();
                });

                onMounted(() => {
                    fetchStudentResults();
                });

                return {
                    students,
                    filteredStudents,
                    paginatedStudents,
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
                    showChartModal,
                    chartStudent,
                    showSmartFilters,
                    smartFilters,
                    yearGroups,
                    faculties,
                    groups,
                    availableRoles,
                    visibleColumns,
                    currentPage,
                    pageSize,
                    pageSizeOptions,
                    totalPages,
                    handleSort,
                    exportToCSV,
                    showStudentChart,
                    toggleGroupAnalytics,
                    addSmartFilter,
                    removeSmartFilter,
                    getRagRating,
                    RAG_CONFIG,
                    THEME_CONFIG,
                    fetchStudentResults,
                    handlePageSizeChange
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
                                    <button @click="showSmartFilters = !showSmartFilters" class="btn-filter">
                                        🔍 Smart Filters
                                    </button>
                                    <button @click="toggleGroupAnalytics" class="btn-analytics">
                                        📊 Group Analytics
                                    </button>
                                    <button @click="exportToCSV" class="btn-export">
                                        📥 Export CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Smart Filters Section -->
                        <div v-if="showSmartFilters" class="srv-smart-filters">
                            <h3>Smart Filters</h3>
                            <div class="filter-list">
                                <div v-for="filter in smartFilters" :key="filter.id" class="filter-row">
                                    <select v-model="filter.dimension">
                                        <option value="vision">Vision</option>
                                        <option value="effort">Effort</option>
                                        <option value="systems">Systems</option>
                                        <option value="practice">Practice</option>
                                        <option value="attitude">Attitude</option>
                                        <option value="overall">Overall</option>
                                    </select>
                                    
                                    <select v-model="filter.cycle">
                                        <option value="1">Cycle 1</option>
                                        <option value="2">Cycle 2</option>
                                        <option value="3">Cycle 3</option>
                                    </select>
                                    
                                    <select v-model="filter.operator">
                                        <option value=">">Greater than</option>
                                        <option value=">=">Greater or equal</option>
                                        <option value="<">Less than</option>
                                        <option value="<=">Less or equal</option>
                                        <option value="=">Equal to</option>
                                    </select>
                                    
                                    <input type="number" v-model.number="filter.value" min="1" max="10" />
                                    
                                    <button @click="removeSmartFilter(filter.id)" class="btn-remove">❌</button>
                                </div>
                            </div>
                            <button @click="addSmartFilter" class="btn-add-filter">+ Add Filter</button>
                        </div>
                        
                        <div class="srv-pagination">
                            <div class="srv-count">
                                Showing {{ paginatedStudents.length }} of {{ filteredStudents.length }} students
                                <span v-if="userRoles.length > 0" class="srv-role-info">
                                    ({{ userRoles.join(', ') }})
                                </span>
                            </div>
                            
                            <div class="srv-pagination-controls">
                                <label>Show:</label>
                                <select v-model="pageSize" @change="handlePageSizeChange">
                                    <option v-for="size in pageSizeOptions" :key="size" :value="size">
                                        {{ size }}
                                    </option>
                                </select>
                                
                                <div v-if="totalPages > 1" class="srv-page-nav">
                                    <button 
                                        @click="currentPage = Math.max(1, currentPage - 1)"
                                        :disabled="currentPage === 1">
                                        ←
                                    </button>
                                    <span>Page {{ currentPage }} of {{ totalPages }}</span>
                                    <button 
                                        @click="currentPage = Math.min(totalPages, currentPage + 1)"
                                        :disabled="currentPage === totalPages">
                                        →
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="srv-table-wrapper">
                            <table class="srv-table">
                                <thead>
                                    <tr class="main-header">
                                        <th rowspan="2" @click="handleSort('name')" class="sortable sticky-col">
                                            Name 
                                            <span class="sort-indicator" v-if="sortField === 'name'">
                                                {{ sortDirection === 'asc' ? '▲' : '▼' }}
                                            </span>
                                        </th>
                                        <th rowspan="2" @click="handleSort('group')" class="sortable">
                                            Group
                                            <span class="sort-indicator" v-if="sortField === 'group'">
                                                {{ sortDirection === 'asc' ? '▲' : '▼' }}
                                            </span>
                                        </th>
                                        
                                        <!-- Vision columns -->
                                        <th v-if="visibleColumns['vision_1'] || visibleColumns['vision_2'] || visibleColumns['vision_3']" 
                                            :colspan="(visibleColumns['vision_1'] ? 1 : 0) + (visibleColumns['vision_2'] ? 1 : 0) + (visibleColumns['vision_3'] ? 1 : 0) + (visibleColumns['vision_trend'] ? 1 : 0)" 
                                            class="dimension-group vision-group">
                                            Vision
                                        </th>
                                        
                                        <!-- Effort columns -->
                                        <th v-if="visibleColumns['effort_1'] || visibleColumns['effort_2'] || visibleColumns['effort_3']" 
                                            :colspan="(visibleColumns['effort_1'] ? 1 : 0) + (visibleColumns['effort_2'] ? 1 : 0) + (visibleColumns['effort_3'] ? 1 : 0) + (visibleColumns['effort_trend'] ? 1 : 0)" 
                                            class="dimension-group effort-group">
                                            Effort
                                        </th>
                                        
                                        <!-- Systems columns -->
                                        <th v-if="visibleColumns['systems_1'] || visibleColumns['systems_2'] || visibleColumns['systems_3']" 
                                            :colspan="(visibleColumns['systems_1'] ? 1 : 0) + (visibleColumns['systems_2'] ? 1 : 0) + (visibleColumns['systems_3'] ? 1 : 0) + (visibleColumns['systems_trend'] ? 1 : 0)" 
                                            class="dimension-group systems-group">
                                            Systems
                                        </th>
                                        
                                        <!-- Practice columns -->
                                        <th v-if="visibleColumns['practice_1'] || visibleColumns['practice_2'] || visibleColumns['practice_3']" 
                                            :colspan="(visibleColumns['practice_1'] ? 1 : 0) + (visibleColumns['practice_2'] ? 1 : 0) + (visibleColumns['practice_3'] ? 1 : 0) + (visibleColumns['practice_trend'] ? 1 : 0)" 
                                            class="dimension-group practice-group">
                                            Practice
                                        </th>
                                        
                                        <!-- Attitude columns -->
                                        <th v-if="visibleColumns['attitude_1'] || visibleColumns['attitude_2'] || visibleColumns['attitude_3']" 
                                            :colspan="(visibleColumns['attitude_1'] ? 1 : 0) + (visibleColumns['attitude_2'] ? 1 : 0) + (visibleColumns['attitude_3'] ? 1 : 0) + (visibleColumns['attitude_trend'] ? 1 : 0)" 
                                            class="dimension-group attitude-group">
                                            Attitude
                                        </th>
                                        
                                        <!-- Overall columns -->
                                        <th v-if="visibleColumns['overall_1'] || visibleColumns['overall_2'] || visibleColumns['overall_3']" 
                                            :colspan="(visibleColumns['overall_1'] ? 1 : 0) + (visibleColumns['overall_2'] ? 1 : 0) + (visibleColumns['overall_3'] ? 1 : 0) + (visibleColumns['overall_trend'] ? 1 : 0)" 
                                            class="dimension-group overall-group">
                                            Overall
                                        </th>
                                        
                                        <th rowspan="2" class="chart-col">📊</th>
                                    </tr>
                                    <tr class="sub-header">
                                        <!-- Vision sub-headers -->
                                        <th v-if="visibleColumns['vision_1']" @click="handleSort('vision_1')" class="cycle-header sortable">V1</th>
                                        <th v-if="visibleColumns['vision_2']" @click="handleSort('vision_2')" class="cycle-header sortable">V2</th>
                                        <th v-if="visibleColumns['vision_3']" @click="handleSort('vision_3')" class="cycle-header sortable">V3</th>
                                        <th v-if="visibleColumns['vision_trend']" class="trend-header">VT</th>
                                        
                                        <!-- Effort sub-headers -->
                                        <th v-if="visibleColumns['effort_1']" @click="handleSort('effort_1')" class="cycle-header sortable">E1</th>
                                        <th v-if="visibleColumns['effort_2']" @click="handleSort('effort_2')" class="cycle-header sortable">E2</th>
                                        <th v-if="visibleColumns['effort_3']" @click="handleSort('effort_3')" class="cycle-header sortable">E3</th>
                                        <th v-if="visibleColumns['effort_trend']" class="trend-header">ET</th>
                                        
                                        <!-- Systems sub-headers -->
                                        <th v-if="visibleColumns['systems_1']" @click="handleSort('systems_1')" class="cycle-header sortable">S1</th>
                                        <th v-if="visibleColumns['systems_2']" @click="handleSort('systems_2')" class="cycle-header sortable">S2</th>
                                        <th v-if="visibleColumns['systems_3']" @click="handleSort('systems_3')" class="cycle-header sortable">S3</th>
                                        <th v-if="visibleColumns['systems_trend']" class="trend-header">ST</th>
                                        
                                        <!-- Practice sub-headers -->
                                        <th v-if="visibleColumns['practice_1']" @click="handleSort('practice_1')" class="cycle-header sortable">P1</th>
                                        <th v-if="visibleColumns['practice_2']" @click="handleSort('practice_2')" class="cycle-header sortable">P2</th>
                                        <th v-if="visibleColumns['practice_3']" @click="handleSort('practice_3')" class="cycle-header sortable">P3</th>
                                        <th v-if="visibleColumns['practice_trend']" class="trend-header">PT</th>
                                        
                                        <!-- Attitude sub-headers -->
                                        <th v-if="visibleColumns['attitude_1']" @click="handleSort('attitude_1')" class="cycle-header sortable">A1</th>
                                        <th v-if="visibleColumns['attitude_2']" @click="handleSort('attitude_2')" class="cycle-header sortable">A2</th>
                                        <th v-if="visibleColumns['attitude_3']" @click="handleSort('attitude_3')" class="cycle-header sortable">A3</th>
                                        <th v-if="visibleColumns['attitude_trend']" class="trend-header">AT</th>
                                        
                                        <!-- Overall sub-headers -->
                                        <th v-if="visibleColumns['overall_1']" @click="handleSort('overall_1')" class="cycle-header sortable">O1</th>
                                        <th v-if="visibleColumns['overall_2']" @click="handleSort('overall_2')" class="cycle-header sortable">O2</th>
                                        <th v-if="visibleColumns['overall_3']" @click="handleSort('overall_3')" class="cycle-header sortable">O3</th>
                                        <th v-if="visibleColumns['overall_trend']" class="trend-header">OT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="student in paginatedStudents" 
                                        :key="student.id"
                                        @mouseenter="hoveredStudent = student"
                                        @mouseleave="hoveredStudent = null"
                                        class="student-row">
                                        
                                        <td class="student-name sticky-col" :title="student.email">{{ student.name }}</td>
                                        <td class="student-group">{{ student.group }}</td>
                                        
                                        <!-- Vision scores -->
                                        <td v-if="visibleColumns['vision_1']" 
                                            :class="['score-cell', getRagRating(student.cycles[1]?.vision) ? 'rag-' + getRagRating(student.cycles[1]?.vision) : '']">
                                            {{ student.cycles[1]?.vision || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['vision_2']" 
                                            :class="['score-cell', getRagRating(student.cycles[2]?.vision) ? 'rag-' + getRagRating(student.cycles[2]?.vision) : '']">
                                            {{ student.cycles[2]?.vision || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['vision_3']" 
                                            :class="['score-cell', getRagRating(student.cycles[3]?.vision) ? 'rag-' + getRagRating(student.cycles[3]?.vision) : '']">
                                            {{ student.cycles[3]?.vision || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['vision_trend']" class="trend-cell">
                                            <span v-if="student.trends.vision === 'up'" class="trend-up">↑</span>
                                            <span v-else-if="student.trends.vision === 'down'" class="trend-down">↓</span>
                                            <span v-else-if="student.trends.vision === 'same'" class="trend-same">→</span>
                                        </td>
                                        
                                        <!-- Effort scores -->
                                        <td v-if="visibleColumns['effort_1']" 
                                            :class="['score-cell', getRagRating(student.cycles[1]?.effort) ? 'rag-' + getRagRating(student.cycles[1]?.effort) : '']">
                                            {{ student.cycles[1]?.effort || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['effort_2']" 
                                            :class="['score-cell', getRagRating(student.cycles[2]?.effort) ? 'rag-' + getRagRating(student.cycles[2]?.effort) : '']">
                                            {{ student.cycles[2]?.effort || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['effort_3']" 
                                            :class="['score-cell', getRagRating(student.cycles[3]?.effort) ? 'rag-' + getRagRating(student.cycles[3]?.effort) : '']">
                                            {{ student.cycles[3]?.effort || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['effort_trend']" class="trend-cell">
                                            <span v-if="student.trends.effort === 'up'" class="trend-up">↑</span>
                                            <span v-else-if="student.trends.effort === 'down'" class="trend-down">↓</span>
                                            <span v-else-if="student.trends.effort === 'same'" class="trend-same">→</span>
                                        </td>
                                        
                                        <!-- Systems scores -->
                                        <td v-if="visibleColumns['systems_1']" 
                                            :class="['score-cell', getRagRating(student.cycles[1]?.systems) ? 'rag-' + getRagRating(student.cycles[1]?.systems) : '']">
                                            {{ student.cycles[1]?.systems || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['systems_2']" 
                                            :class="['score-cell', getRagRating(student.cycles[2]?.systems) ? 'rag-' + getRagRating(student.cycles[2]?.systems) : '']">
                                            {{ student.cycles[2]?.systems || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['systems_3']" 
                                            :class="['score-cell', getRagRating(student.cycles[3]?.systems) ? 'rag-' + getRagRating(student.cycles[3]?.systems) : '']">
                                            {{ student.cycles[3]?.systems || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['systems_trend']" class="trend-cell">
                                            <span v-if="student.trends.systems === 'up'" class="trend-up">↑</span>
                                            <span v-else-if="student.trends.systems === 'down'" class="trend-down">↓</span>
                                            <span v-else-if="student.trends.systems === 'same'" class="trend-same">→</span>
                                        </td>
                                        
                                        <!-- Practice scores -->
                                        <td v-if="visibleColumns['practice_1']" 
                                            :class="['score-cell', getRagRating(student.cycles[1]?.practice) ? 'rag-' + getRagRating(student.cycles[1]?.practice) : '']">
                                            {{ student.cycles[1]?.practice || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['practice_2']" 
                                            :class="['score-cell', getRagRating(student.cycles[2]?.practice) ? 'rag-' + getRagRating(student.cycles[2]?.practice) : '']">
                                            {{ student.cycles[2]?.practice || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['practice_3']" 
                                            :class="['score-cell', getRagRating(student.cycles[3]?.practice) ? 'rag-' + getRagRating(student.cycles[3]?.practice) : '']">
                                            {{ student.cycles[3]?.practice || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['practice_trend']" class="trend-cell">
                                            <span v-if="student.trends.practice === 'up'" class="trend-up">↑</span>
                                            <span v-else-if="student.trends.practice === 'down'" class="trend-down">↓</span>
                                            <span v-else-if="student.trends.practice === 'same'" class="trend-same">→</span>
                                        </td>
                                        
                                        <!-- Attitude scores -->
                                        <td v-if="visibleColumns['attitude_1']" 
                                            :class="['score-cell', getRagRating(student.cycles[1]?.attitude) ? 'rag-' + getRagRating(student.cycles[1]?.attitude) : '']">
                                            {{ student.cycles[1]?.attitude || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['attitude_2']" 
                                            :class="['score-cell', getRagRating(student.cycles[2]?.attitude) ? 'rag-' + getRagRating(student.cycles[2]?.attitude) : '']">
                                            {{ student.cycles[2]?.attitude || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['attitude_3']" 
                                            :class="['score-cell', getRagRating(student.cycles[3]?.attitude) ? 'rag-' + getRagRating(student.cycles[3]?.attitude) : '']">
                                            {{ student.cycles[3]?.attitude || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['attitude_trend']" class="trend-cell">
                                            <span v-if="student.trends.attitude === 'up'" class="trend-up">↑</span>
                                            <span v-else-if="student.trends.attitude === 'down'" class="trend-down">↓</span>
                                            <span v-else-if="student.trends.attitude === 'same'" class="trend-same">→</span>
                                        </td>
                                        
                                        <!-- Overall scores -->
                                        <td v-if="visibleColumns['overall_1']" 
                                            :class="['score-cell', getRagRating(student.cycles[1]?.overall) ? 'rag-' + getRagRating(student.cycles[1]?.overall) : '']">
                                            {{ student.cycles[1]?.overall || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['overall_2']" 
                                            :class="['score-cell', getRagRating(student.cycles[2]?.overall) ? 'rag-' + getRagRating(student.cycles[2]?.overall) : '']">
                                            {{ student.cycles[2]?.overall || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['overall_3']" 
                                            :class="['score-cell', getRagRating(student.cycles[3]?.overall) ? 'rag-' + getRagRating(student.cycles[3]?.overall) : '']">
                                            {{ student.cycles[3]?.overall || '-' }}
                                        </td>
                                        <td v-if="visibleColumns['overall_trend']" class="trend-cell">
                                            <span v-if="student.trends.overall === 'up'" class="trend-up">↑</span>
                                            <span v-else-if="student.trends.overall === 'down'" class="trend-down">↓</span>
                                            <span v-else-if="student.trends.overall === 'same'" class="trend-same">→</span>
                                        </td>
                                        
                                        <td class="chart-col">
                                            <button @click="showStudentChart(student)" class="chart-btn" title="View Progress Chart">
                                                📈
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div v-if="paginatedStudents.length === 0" class="srv-no-results">
                            <p>No students found matching your criteria.</p>
                        </div>
                    </div>
                    
                    <!-- Student Chart Modal -->
                    <div v-if="showChartModal" class="srv-modal" @click.self="showChartModal = false">
                        <div class="srv-modal-content">
                            <span class="srv-modal-close" @click="showChartModal = false">&times;</span>
                            <h3>{{ chartStudent?.name }} - Progress Chart</h3>
                            <div class="chart-container">
                                <canvas id="studentChart"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Group Analytics Modal -->
                    <div v-if="showGroupAnalytics" class="srv-modal" @click.self="showGroupAnalytics = false">
                        <div class="srv-modal-content">
                            <span class="srv-modal-close" @click="showGroupAnalytics = false">&times;</span>
                            <h3>Group Analytics</h3>
                            <div class="chart-container">
                                <canvas id="groupChart"></canvas>
                            </div>
                            <div class="analytics-summary">
                                <p>Total Students: {{ filteredStudents.length }}</p>
                                <p>Average Scores by Dimension</p>
                            </div>
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

})(); // End of main IIFE wrapper
