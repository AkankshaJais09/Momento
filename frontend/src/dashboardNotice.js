let pendingNotice = ''

export function setDashboardNotice(notice) {
  pendingNotice = notice
}

export function peekDashboardNotice() {
  return pendingNotice
}

export function consumeDashboardNotice() {
  const notice = pendingNotice
  pendingNotice = ''
  return notice
}
