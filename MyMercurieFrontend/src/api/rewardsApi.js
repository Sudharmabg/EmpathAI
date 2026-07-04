import { apiRequest } from './apiClient'

const BASE = '/api/rewards'

// ── Badges Admin APIs ───────────────────────────────────────────────────────

export async function fetchBadges() {
  const res = await apiRequest(`${BASE}/badges`)
  if (!res.ok) throw new Error(`Failed to fetch badges (HTTP ${res.status})`)
  return res.json()
}

export async function createBadge({ title, triggerType, triggerTitle, triggerValue, imageFile }) {
  const form = new FormData()
  form.append('title', title)
  form.append('triggerType', triggerType)
  form.append('triggerTitle', triggerTitle)
  if (triggerValue !== undefined && triggerValue !== null) form.append('triggerValue', String(triggerValue))
  if (imageFile) form.append('image', imageFile)

  const res = await apiRequest(`${BASE}/badges`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Failed to create badge (HTTP ${res.status})`)
  return res.json()
}

export async function updateBadge(id, { title, triggerType, triggerTitle, triggerValue, imageFile }) {
  const form = new FormData()
  form.append('title', title)
  form.append('triggerType', triggerType)
  form.append('triggerTitle', triggerTitle)
  if (triggerValue !== undefined && triggerValue !== null) form.append('triggerValue', String(triggerValue))
  if (imageFile) form.append('image', imageFile)

  const res = await apiRequest(`${BASE}/badges/${id}`, { method: 'PUT', body: form })
  if (!res.ok) throw new Error(`Failed to update badge (HTTP ${res.status})`)
  return res.json()
}

export async function deleteBadge(id) {
  const res = await apiRequest(`${BASE}/badges/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete badge (HTTP ${res.status})`)
}

// ── Student Badges APIs ─────────────────────────────────────────────────────

/**
 * Fetch badges for the CURRENTLY LOGGED-IN student.
 * Uses /students/me/badges which extracts student ID from JWT.
 */
export async function fetchMyBadges() {
  try {
    const res = await apiRequest(`${BASE}/students/me/badges`)
    
    if (res.status === 401) {
      throw new Error('Unauthorized - Please log in again')
    }
    
    if (res.status === 403) {
      throw new Error('Access denied - You must be logged in as a student')
    }
    
    if (!res.ok) {
      let errorMsg = `Failed to fetch badges (HTTP ${res.status})`
      try {
        const data = await res.json()
        if (data.message || data.error) {
          errorMsg = data.message || data.error
        }
      } catch { /* ignore parse error */ }
      throw new Error(errorMsg)
    }
    
    return await res.json()
    
  } catch (error) {
    console.error('Error in fetchMyBadges:', error)
    throw error
  }
}

/**
 * Fetch badges for ANY student by ID (Admin/Staff only).
 * @param {number|string} studentId - The student's database ID
 */
export async function fetchStudentBadges(studentId) {
  if (!studentId) {
    throw new Error('Student ID is required')
  }

  try {
    const res = await apiRequest(`${BASE}/students/${studentId}/badges`)
    
    if (res.status === 401) {
      throw new Error('Unauthorized - Please log in again')
    }
    if (res.status === 403) {
      throw new Error('Forbidden - You do not have permission to view this student\'s badges')
    }
    if (res.status === 404) {
      throw new Error('Student not found')
    }
    
    if (!res.ok) {
      let errorMsg = `Failed to fetch student badges (HTTP ${res.status})`
      try {
        const data = await res.json()
        if (data.message || data.error) {
          errorMsg = data.message || data.error
        }
      } catch { /* ignore parse error */ }
      throw new Error(errorMsg)
    }
    
    return await res.json()
  } catch (error) {
    console.error(`Error in fetchStudentBadges for student ${studentId}:`, error.message)
    throw error
  }
}

export async function awardBadgeToStudent(studentId, badgeId) {
  if (!studentId || !badgeId) {
    throw new Error('Student ID and Badge ID are required')
  }

  try {
    const res = await apiRequest(`${BASE}/students/${studentId}/badges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeId })
    })
    
    if (res.status === 401) {
      throw new Error('Unauthorized - Please log in again')
    }
    if (res.status === 403) {
      throw new Error('Forbidden - Permission denied')
    }
    if (res.status === 409) {
      throw new Error('Student already has this badge')
    }
    
    if (!res.ok) {
      let errorMsg = `Failed to award badge (HTTP ${res.status})`
      try {
        const data = await res.json()
        if (data.message || data.error) errorMsg = data.message || data.error
      } catch {}
      throw new Error(errorMsg)
    }
    
    return await res.json()
  } catch (error) {
    console.error(`Error awarding badge ${badgeId} to student ${studentId}:`, error.message)
    throw error
  }
}

export async function removeStudentBadge(studentId, studentBadgeId) {
  if (!studentId || !studentBadgeId) {
    throw new Error('Student ID and Student Badge ID are required')
  }

  try {
    const res = await apiRequest(`${BASE}/students/${studentId}/badges/${studentBadgeId}`, {
      method: 'DELETE'
    })
    
    if (!res.ok) {
      if (res.status === 401) throw new Error('Unauthorized - Please log in again')
      if (res.status === 403) throw new Error('Forbidden - Permission denied')
      throw new Error(`Failed to remove badge (HTTP ${res.status})`)
    }
  } catch (error) {
    console.error(`Error removing badge from student ${studentId}:`, error.message)
    throw error
  }
}

// ── Achievements APIs ───────────────────────────────────────────────────────

export async function fetchAchievements() {
  const res = await apiRequest(`${BASE}/achievements`)
  if (!res.ok) throw new Error(`Failed to fetch achievements (HTTP ${res.status})`)
  return res.json()
}

export async function createAchievement({ title, description, imageFile }) {
  const form = new FormData()
  form.append('title', title)
  form.append('description', description)
  if (imageFile) form.append('image', imageFile)

  const res = await apiRequest(`${BASE}/achievements`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Failed to create achievement (HTTP ${res.status})`)
  return res.json()
}

export async function updateAchievement(id, { title, description, imageFile }) {
  const form = new FormData()
  form.append('title', title)
  form.append('description', description)
  if (imageFile) form.append('image', imageFile)

  const res = await apiRequest(`${BASE}/achievements/${id}`, { method: 'PUT', body: form })
  if (!res.ok) throw new Error(`Failed to update achievement (HTTP ${res.status})`)
  return res.json()
}

export async function deleteAchievement(id) {
  const res = await apiRequest(`${BASE}/achievements/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete achievement (HTTP ${res.status})`)
}

export async function fetchStudentAchievements(studentId) {
  try {
    const endpoint = studentId 
      ? `${BASE}/students/${studentId}/achievements`
      : `${BASE}/students/me/achievements`
    
    const res = await apiRequest(endpoint)
    
    if (res.status === 401) throw new Error('Unauthorized - Please log in again')
    if (res.status === 403) throw new Error('Forbidden - Access denied')
    if (res.status === 404) throw new Error('Student not found')
    if (!res.ok) throw new Error(`Failed to fetch student achievements (HTTP ${res.status})`)
    
    return await res.json()
  } catch (error) {
    console.error('Error in fetchStudentAchievements:', error.message)
    throw error
  }
}

export async function awardAchievementToStudent(studentId, achievementId) {
  if (!studentId || !achievementId) {
    throw new Error('Student ID and Achievement ID are required')
  }

  try {
    const res = await apiRequest(`${BASE}/students/${studentId}/achievements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ achievementId })
    })
    
    if (res.status === 401) throw new Error('Unauthorized - Please log in again')
    if (res.status === 403) throw new Error('Forbidden - Permission denied')
    if (res.status === 409) throw new Error('Student already has this achievement')
    if (!res.ok) throw new Error(`Failed to award achievement (HTTP ${res.status})`)
    
    return await res.json()
  } catch (error) {
    console.error(`Error awarding achievement to student ${studentId}:`, error.message)
    throw error
  }
}