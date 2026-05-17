import { apiGet, apiPost, apiPut, apiDelete } from './apiClient.js';

// ── Students ──────────────────────────────────────────────────────────────────

export function getStudents({ school, search, page = 0, size = 50 } = {}) {
    const params = new URLSearchParams();
    if (school) params.set('school', school);
    if (search) params.set('search', search);
    params.set('page', page);
    params.set('size', size);
    return apiGet('/api/users/students?' + params);
}

export function getSchoolAdmins({ search, page = 0, size = 50 } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', page);
    params.set('size', size);
    return apiGet('/api/users/school-admins?' + params);
}

export function getPsychologists({ search, page = 0, size = 50 } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', page);
    params.set('size', size);
    return apiGet('/api/users/psychologists?' + params);
}

export function getContentAdmins({ search, page = 0, size = 50 } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', page);
    params.set('size', size);
    return apiGet('/api/users/content-admins?' + params);
}

export function getSchoolSummaries() {
    return apiGet('/api/schools/summary');
}

export function getUser(id) {
    return apiGet('/api/users/' + id);
}

export function createUser(data) {
    return apiPost('/api/users', data);
}

export function updateUser(id, data) {
    return apiPut('/api/users/' + id, data);
}

export function deleteUser(id) {
    return apiDelete('/api/users/' + id);
}

export function resetPassword(id) {
    return apiPost('/api/users/' + id + '/reset-password');
}

export function getSchools() {
    return apiGet('/api/schools');
}

export function createSchool(data) {
    return apiPost('/api/schools', data);
}

export function deleteSchool(id) {
    return apiDelete('/api/schools/' + id);
}

export function getAnalyticsDashboard() {
    return apiGet('/api/analytics/dashboard');
}

export function getQuestions() {
    return apiGet('/api/questionnaire/questions');
}

export function createQuestion(data) {
    return apiPost('/api/questionnaire/questions', data);
}

export function updateQuestion(id, data) {
    return apiPut('/api/questionnaire/questions/' + id, data);
}

export function deleteQuestion(id) {
    return apiDelete('/api/questionnaire/questions/' + id);
}

export function getGroups() {
    return apiGet('/api/questionnaire/groups');
}

export function createGroup(data) {
    return apiPost('/api/questionnaire/groups', data);
}

export function deleteGroup(name) {
    return apiDelete('/api/questionnaire/groups/' + name);
}

export function getResponses({ studentId, page = 0, size = 20 } = {}) {
    const params = new URLSearchParams();
    if (studentId) params.set('studentId', studentId);
    params.set('page', page);
    params.set('size', size);
    return apiGet('/api/questionnaire/responses?' + params);
}

export function getSyllabi({ classLevel, page = 0, size = 100 } = {}) {
    const params = new URLSearchParams();
    if (classLevel) params.set('classLevel', classLevel);
    params.set('page', page);
    params.set('size', size);
    return apiGet('/api/syllabi?' + params);
}

export function getSyllabus(id) {
    return apiGet('/api/syllabi/' + id);
}

export function createSyllabus(data) {
    return apiPost('/api/syllabi', data);
}

export function updateSyllabus(id, data) {
    return apiPut('/api/syllabi/' + id, data);
}

export function deleteSyllabus(id) {
    return apiDelete('/api/syllabi/' + id);
}

export function getModules(syllabusId) {
    return apiGet('/api/syllabi/' + syllabusId + '/modules');
}

export function createModule(syllabusId, data) {
    return apiPost('/api/syllabi/' + syllabusId + '/modules', data);
}

export function updateModule(id, data) {
    return apiPut('/api/modules/' + id, data);
}

export function deleteModule(id) {
    return apiDelete('/api/modules/' + id);
}

export function getUserById(id) {
    return apiGet('/api/users/' + id);
}

export function getClassesBySchool(schoolId) {
    return apiGet('/api/schools/' + schoolId + '/classes');
}

export function getStudentsByClass(schoolId, className) {
    return apiGet('/api/schools/' + schoolId + '/classes/' + encodeURIComponent(className) + '/students');
}

export function getStudentDetail(schoolId, className, studentId) {
    return apiGet('/api/schools/' + schoolId + '/classes/' + encodeURIComponent(className) + '/students/' + studentId);
}

export async function updateTimeSpent(userId, seconds) {
    if (!userId || seconds <= 0) return;
    return await apiPost('/api/users/' + userId + '/time-spent', { seconds });
}