import { apiGet, apiPost, apiPut, apiDelete, apiRequest } from './apiClient.js';

// ── TASKS ─────────────────────────────────────────────────────────────────────

export async function getWeekTasks(studentId) {
    const res = await apiGet(`/api/schedule/${studentId}/week`);
    return res.data;
}

export async function getDayTasks(studentId, day) {
    const res = await apiGet(`/api/schedule/${studentId}/${day}`);
    return res.data;
}

export async function addTask(studentId, dayOfWeek, title, startTime, endTime, notes, detectedType) {
    const res = await apiPost('/api/schedule/task', {
        studentId, dayOfWeek, title, startTime, endTime, notes: notes || '', detectedType
    });
    return res.data;
}

export async function editTask(taskId, studentId, dayOfWeek, title, startTime, endTime, notes, detectedType) {
    const res = await apiPut(`/api/schedule/task/${taskId}`, {
        studentId, dayOfWeek, title, startTime, endTime, notes: notes || '', detectedType
    });
    return res.data;
}

export async function toggleTaskComplete(taskId) {
    const res = await apiRequest(`/api/schedule/task/${taskId}/complete`, { method: 'PATCH' });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to toggle task');
    }
    const json = await res.json();
    return json.data;
}

export async function deleteTask(taskId) {
    await apiDelete(`/api/schedule/task/${taskId}`);
}

// ── RECOMMENDATIONS ───────────────────────────────────────────────────────────

export async function getRecommendations(studentId, day) {
    const res = await apiGet(`/api/schedule/${studentId}/recommendations?day=${day}`);
    return res.data;
}

// ── SCHOOL TIMINGS (Admin) ────────────────────────────────────────────────────

export async function saveSchoolTimings(schoolId, timings) {
    const res = await apiPost(`/api/schedule/school-timings/${schoolId}`, timings);
    return res.data;
}

export async function getSchoolTimings(schoolId) {
    const res = await apiGet(`/api/schedule/school-timings/${schoolId}`);
    return res.data;
}

// ── EXAM DATES (Admin) ────────────────────────────────────────────────────────

export async function addExamDate(schoolId, className, subjectName, examDate) {
    const res = await apiPost('/api/schedule/exam-dates', {
        schoolId, className, subjectName, examDate
    });
    return res.data;
}

export async function getExamDates(schoolId) {
    const res = await apiGet(`/api/schedule/exam-dates/${schoolId}`);
    return res.data;
}

export async function deleteExamDate(examId) {
    await apiDelete(`/api/schedule/exam-dates/${examId}`);
}

// ── PREFERENCES ───────────────────────────────────────────────────────────────

export async function getOnboardingStatus(studentId) {
    const res = await apiGet(`/api/schedule/preferences/${studentId}/status`);
    return res.data;
}

export async function savePreferences(studentId, preferredStudyTime, busySlots) {
    const res = await apiPost('/api/schedule/preferences', {
        studentId, preferredStudyTime, busySlots: busySlots || []
    });
    return res.data;
}

export async function getPreferences(studentId) {
    const res = await apiGet(`/api/schedule/preferences/${studentId}`);
    return res.data;
}