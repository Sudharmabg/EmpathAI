import { apiRequest } from './apiClient.js'

// ── STUDENT GOALS ─────────────────────────────────────────────────────────────

export async function getGoals(studentId) {
    const res = await apiRequest('/api/activities/goals/' + studentId)
    if (!res.ok) throw new Error('Failed to fetch goals (HTTP ' + res.status + ')')
    const json = await res.json()
    return json.data || json
}

export async function saveGoal(studentId, goalText, subjectTag, targetDate) {
    const res = await apiRequest('/api/activities/goals', {
        method: 'POST',
        body: JSON.stringify({
            studentId,
            goalText,
            subjectTag,
            targetDate
        })
    })
    if (!res.ok) throw new Error('Failed to save goal (HTTP ' + res.status + ')')
    const json = await res.json()
    return json.data || json
}

export async function deleteGoal(studentId, goalId) {
    const res = await apiRequest('/api/activities/goals/' + studentId + '/' + goalId, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to delete goal (HTTP ' + res.status + ')')
}

// ── INTERVENTION TRACKING ─────────────────────────────────────────────────────

export async function completeIntervention(studentId, activityType) {
    if (!studentId) return
    const res = await apiRequest('/api/users/' + studentId + '/intervention-complete', {
        method: 'POST',
        body: JSON.stringify({ activityType: activityType })
    })
    if (!res.ok) throw new Error('Failed to record intervention (HTTP ' + res.status + ')')
    return res.json()
}

// ✅ XP AWARD ──────────────────────────────────────────────────────────────────

export async function awardActivityXP() {
    const res = await apiRequest('/api/rewards/xp', {
        method: 'POST'
    })
    if (!res.ok) throw new Error('Failed to award XP (HTTP ' + res.status + ')')
    return res.json()
}