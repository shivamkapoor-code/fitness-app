let toastCallback = null

export function registerToast(cb) {
  toastCallback = cb
}

export function showToast(message, type = 'success') {
  if (toastCallback) toastCallback({ message, type, id: Date.now() })
}
