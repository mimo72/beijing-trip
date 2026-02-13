// Global test setup for jsdom environment
// Ensures DOM elements required by app.js exist before module import

if (!document.getElementById('root')) {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
}

if (!document.getElementById('toast')) {
  const toast = document.createElement('div');
  toast.id = 'toast';
  document.body.appendChild(toast);
}
