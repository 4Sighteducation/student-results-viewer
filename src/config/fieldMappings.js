/**
 * Field Mappings Configuration
 * Central configuration for all Knack field IDs and object references
 */

const FIELD_MAPPINGS = {
    // Object IDs
    objects: {
        vespaResults: 'object_10',
        establishment: 'object_2',
        student: 'object_6',
        staffAdmin: 'object_5',
        tutor: 'object_7',
        headOfYear: 'object_18',
        subjectTeacher: 'object_78'
    },

    // Connection Fields in Object_10
    connections: {
        establishment: 'field_133',      // Links to Object_2
        staffAdmin: 'field_439',         // Links to Object_5
        tutor: 'field_145',              // Links to Object_7
        headOfYear: 'field_429',         // Links to Object_18
        subjectTeacher: 'field_2191',    // Links to Object_78
        student: 'field_166'             // Student Email/Connection
    },

    // Student Information Fields
    studentInfo: {
        name: 'field_187',               // Student Name (firstName, lastName)
        email: 'field_166',              // Student Email
        group: 'field_223',              // Group (short text)
        yearGroup: 'field_144',          // Year Group (short text)
        faculty: 'field_782',            // Faculty (short text)
        cycle: 'field_846'               // Cycle (formatted as "Cycle 1", "Cycle 2", etc.)
    },

    // VESPA Score Fields by Cycle
    scores: {
        cycle1: {
            vision: 'field_171',
            effort: 'field_172',
            systems: 'field_173',
            practice: 'field_174',
            attitude: 'field_175',
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

    // Staff Role Email Fields (for matching logged-in user)
    staffEmails: {
        staffAdmin: 'field_86',         // In Object_5
        tutor: 'field_96',              // In Object_7
        headOfYear: 'field_417',        // In Object_18
        subjectTeacher: 'field_1879'    // In Object_78
    }
};

// RAG Rating Configuration
const RAG_CONFIG = {
    red: { min: 1, max: 3, color: '#dc3545', bgColor: '#fee', label: 'Needs Improvement' },
    amber: { min: 4, max: 5, color: '#ffc107', bgColor: '#fff3cd', label: 'Developing' },
    lightGreen: { min: 6, max: 8, color: '#28a745', bgColor: '#d4edda', label: 'Good' },
    darkGreen: { min: 9, max: 10, color: '#155724', bgColor: '#c3e6cb', label: 'Excellent' }
};

// Get RAG rating for a score
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

// Theme Configuration
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

// Export configurations
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FIELD_MAPPINGS, RAG_CONFIG, THEME_CONFIG, getRagRating };
} else {
    window.STUDENT_RESULTS_CONFIG = { FIELD_MAPPINGS, RAG_CONFIG, THEME_CONFIG, getRagRating };
}
