function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
  } catch (_) {
    return null;
  }
}

const user = currentUser();

if (user?.role !== 'admin') {
  window.location.replace('/index.html');
  throw new Error('Admin route requires login.');
}
