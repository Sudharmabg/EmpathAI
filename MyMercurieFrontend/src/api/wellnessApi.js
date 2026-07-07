import { apiRequest } from './apiClient.js'

const BASE = '/api/wellness'


export async function getMindDumpEntries(studentId) {
    const res = await apiRequest(BASE + '/minddump/' + studentId)
    if (!res.ok) throw new Error('Failed to fetch mind dump entries (HTTP ' + res.status + ')')
    return res.json()
}

export async function saveMindDumpEntry(studentId, promptText, entryText) {
    const res = await apiRequest(BASE + '/minddump', {
        method: 'POST',
        body: JSON.stringify({ studentId: studentId, promptText: promptText, entryText: entryText })
    })
    if (!res.ok) throw new Error('Failed to save mind dump entry (HTTP ' + res.status + ')')
    return res.json()
}

export async function deleteMindDumpEntry(entryId) {
    const res = await apiRequest(BASE + '/minddump/' + entryId, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Failed to delete mind dump entry (HTTP ' + res.status + ')')
}

export async function saveMoodEntry(studentId, mood, note) {
    const res = await apiRequest(BASE + '/mood', {
        method: 'POST',
        body: JSON.stringify({ studentId: studentId, mood: mood, note: note })
    })
    if (!res.ok) throw new Error('Failed to save mood entry (HTTP ' + res.status + ')')
    return res.json()
}

export async function getLatestMood(studentId) {
    const res = await apiRequest(BASE + '/mood/' + studentId + '/latest')
    if (res.status === 204) return null
    if (!res.ok) throw new Error('Failed to fetch latest mood (HTTP ' + res.status + ')')
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
        body: JSON.stringify({ studentId: studentId, bedtime: bedtime, wakeTime: wakeTime, quality: quality })
    })
    if (!res.ok) throw new Error('Failed to save sleep entry (HTTP ' + res.status + ')')
    return res.json()
}