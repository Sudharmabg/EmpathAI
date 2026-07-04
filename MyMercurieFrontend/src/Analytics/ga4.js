import ReactGA from 'react-ga4'


export const trackTabView = (tabName, studentId, className) => {
  ReactGA.event('tab_view', {
    tab_name:   tabName,
    student_id: studentId,
    class_name: className || '',
  })
}

export const trackTimeSpent = (tabName, studentId, seconds) => {
  ReactGA.event('time_spent_on_tab', {
    tab_name:      tabName,
    student_id:    studentId,
    time_seconds:  seconds,
  })
}