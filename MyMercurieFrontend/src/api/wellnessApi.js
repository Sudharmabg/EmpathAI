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