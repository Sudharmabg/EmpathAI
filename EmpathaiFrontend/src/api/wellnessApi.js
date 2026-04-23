import { apiRequest } from './apiClient.js'

const BASE = '/api/wellness'

// ── MOOD ─────────────────────────────────────────────────────────────────────

export async function getMoodEntries(studentId) {
    const res = await apiRequest(BASE + '/mood/' + studentId)
    if (!res.ok) throw new Error('Failed to fetch mood entries (HTTP ' + res.status + ')')
    return res.json()
}

export async function getLatestMood(studentId) {
    const res = await apiRequest(BASE + '/mood/' + studentId + '/latest')
    if (res.status === 204) return null
    if (!res.ok) throw new Error('Failed to fetch latest mood (HTTP ' + res.status + ')')
    return res.json()
}

export async function saveMoodEntry(studentId, mood, note) {
    const res = await apiRequest(BASE + '/mood', {
        method: 'POST',
        body: JSON.stringify({ studentId: studentId, mood: mood, note: note || null })
    })
    if (!res.ok) throw new Error('Failed to save mood (HTTP ' + res.status + ')')
    return res.json()
}

// ── GRATITUDE ────────────────────────────────────────────────────────────────

export async function getGratitudeEntries(studentId) {
    const res = await apiRequest(BASE + '/gratitude/' + studentId)
    if (!res.ok) throw new Error('Failed to fetch gratitude entries (HTTP ' + res.status + ')')
    return res.json()
}

export async function saveGratitudeEntry(studentId, entryText) {
    const res = await apiRequest(BASE + '/gratitude', {
        method: 'POST',
        body: JSON.stringify({ studentId: studentId, entryText: entryText })
    })
    if (!res.ok) throw new Error('Failed to save gratitude entry (HTTP ' + res.status + ')')
    return res.json()
}

export async function deleteGratitudeEntry(entryId) {
    const res = await apiRequest(BASE + '/gratitude/' + entryId, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to delete gratitude entry (HTTP ' + res.status + ')')
}

// ── SLEEP ────────────────────────────────────────────────────────────────────

export async function getSleepEntries(studentId) {
    const res = await apiRequest(BASE + '/sleep/' + studentId)
    if (!res.ok) throw new Error('Failed to fetch sleep entries (HTTP ' + res.status + ')')
    return res.json()
}

export async function getLatestSleep(studentId) {
    const res = await apiRequest(BASE + '/sleep/' + studentId + '/latest')
    if (res.status === 204) return null
    if (!res.ok) throw new Error('Failed to fetch latest sleep (HTTP ' + res.status + ')')
    return res.json()
}

export async function saveSleepEntry(studentId, bedtime, wakeTime, quality) {
    const res = await apiRequest(BASE + '/sleep', {
        method: 'POST',
        body: JSON.stringify({
            studentId: studentId,
            bedtime: bedtime,
            wakeTime: wakeTime,
            quality: quality
        })
    })
    if (!res.ok) throw new Error('Failed to save sleep entry (HTTP ' + res.status + ')')
    return res.json()
}