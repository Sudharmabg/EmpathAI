import { apiGet, apiPost, apiPut, apiDelete, apiRequest } from './apiClient.js';

// Get full week tasks for a student
export async function getWeekTasks(studentId) {
    const res = await apiGet(`/api/schedule/${studentId}/week`);
    return res.data; // { Monday: [...], Tuesday: [...], ... }
}

// Get tasks for a specific day
export async function getDayTasks(studentId, day) {
    const res = await apiGet(`/api/schedule/${studentId}/${day}`);
    return res.data;
}

// Add a new task — returns { task, warnings }
export async function addTask(studentId, dayOfWeek, title, startTime, endTime, notes) {
    const res = await apiPost('/api/schedule/task', {
        studentId,
        dayOfWeek,
        title,
        startTime,
        endTime,
        notes: notes || ''
    });
    return res.data; // TaskResponse with warnings[]
}

// Edit an existing task
export async function editTask(taskId, studentId, dayOfWeek, title, startTime, endTime, notes) {
    const res = await apiPut(`/api/schedule/task/${taskId}`, {
        studentId,
        dayOfWeek,
        title,
        startTime,
        endTime,
        notes: notes || ''
    });
    return res.data;
}

// Toggle complete
export async function toggleTaskComplete(taskId) {
    const res = await apiRequest(`/api/schedule/task/${taskId}/complete`, { method: 'PATCH' });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to toggle task');
    }
    const json = await res.json();
    return json.data;
}

// Delete a task
export async function deleteTask(taskId) {
    await apiDelete(`/api/schedule/task/${taskId}`);
}

// ── RECOMMENDATIONS ───────────────────────────────────────────────────────────
// Returns { blockedWindows, upcomingExams, suggestions }
export async function getRecommendations(studentId, day) {
    const res = await apiGet(`/api/schedule/${studentId}/recommendations?day=${day}`);
    return res.data;
}

// ── SCHOOL TIMINGS (Admin) ────────────────────────────────────────────────────
// Save all timings for a school (replaces existing)
export async function saveSchoolTimings(schoolId, timings) {
    const res = await apiPost(`/api/schedule/school-timings/${schoolId}`, timings);
    return res.data;
}

// Get all timings for a school
export async function getSchoolTimings(schoolId) {
    const res = await apiGet(`/api/schedule/school-timings/${schoolId}`);
    return res.data;
}

// ── EXAM DATES (Admin) ────────────────────────────────────────────────────────
// Add a new exam date
export async function addExamDate(schoolId, className, subjectName, examDate) {
    const res = await apiPost('/api/schedule/exam-dates', {
        schoolId,
        className,
        subjectName,
        examDate
    });
    return res.data;
}

// Get all exam dates for a school
export async function getExamDates(schoolId) {
    const res = await apiGet(`/api/schedule/exam-dates/${schoolId}`);
    return res.data;
}

// Delete an exam date
export async function deleteExamDate(examId) {
    await apiDelete(`/api/schedule/exam-dates/${examId}`);
}