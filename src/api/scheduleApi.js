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