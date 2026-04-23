// src/api/teacherapi.js
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient.js'

export function getTeachers({ school, search, page = 0, size = 200 } = {}) {
  const params = new URLSearchParams()
  if (school) params.set('school', school)
  if (search) params.set('search', search)
  params.set('page', page)
  params.set('size', size)
  return apiGet(`/api/teachers?${params}`)
}

export function getTeacherById(id) {
  return apiGet(`/api/teachers/${id}`)
}

export function createTeacher(data) {
  return apiPost('/api/teachers', data)
}

export function updateTeacher(id, data) {
  return apiPut(`/api/teachers/${id}`, data)
}

export function deleteTeacher(id) {
  return apiDelete(`/api/teachers/${id}`)
}

export function resetTeacherPassword(id) {
  return apiPost(`/api/teachers/${id}/reset-password`)
}