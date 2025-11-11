// Admin Dashboard JavaScript

// Configuration
const API_BASE = window.location.origin;
let authToken = null;
let currentDeleteFilename = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const uploadProgress = document.getElementById('uploadProgress');
const uploadResult = document.getElementById('uploadResult');
const progressFill = document.getElementById('progressFill');
const progressFilename = document.getElementById('progressFilename');
const progressStatus = document.getElementById('progressStatus');
const progressMessage = document.getElementById('progressMessage');

const documentsLoading = document.getElementById('documentsLoading');
const documentsError = document.getElementById('documentsError');
const documentsTable = document.getElementById('documentsTable');
const documentsTableBody = document.getElementById('documentsTableBody');
const noDocuments = document.getElementById('noDocuments');
const refreshBtn = document.getElementById('refreshBtn');

const deleteModal = document.getElementById('deleteModal');
const deleteMessage = document.getElementById('deleteMessage');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupEventListeners();
});

// Check if already authenticated
function checkAuth() {
  const savedToken = localStorage.getItem('admin_token');
  if (savedToken) {
    authToken = savedToken;
    showDashboard();
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Login
  loginForm.addEventListener('submit', handleLogin);

  // Logout
  logoutBtn.addEventListener('click', handleLogout);

  // File Upload
  selectFileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  // Drag and Drop
  uploadArea.addEventListener('dragover', handleDragOver);
  uploadArea.addEventListener('dragleave', handleDragLeave);
  uploadArea.addEventListener('drop', handleDrop);

  // Refresh Documents
  refreshBtn.addEventListener('click', loadDocuments);

  // Delete Modal
  cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    currentDeleteFilename = null;
  });
  confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);
}

// Login Handler
async function handleLogin(e) {
  e.preventDefault();

  const password = document.getElementById('password').value;
  loginError.style.display = 'none';

  try {
    const response = await fetch(`${API_BASE}/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (response.ok) {
      authToken = data.token;
      localStorage.setItem('admin_token', authToken);
      showDashboard();
    } else {
      showError(loginError, data.message || 'Invalid password');
    }
  } catch (error) {
    showError(loginError, 'Connection error. Please try again.');
  }
}

// Logout Handler
function handleLogout() {
  authToken = null;
  localStorage.removeItem('admin_token');
  showLogin();
}

// Show Dashboard
function showDashboard() {
  loginScreen.classList.remove('active');
  dashboardScreen.classList.add('active');
  loadDocuments();
}

// Show Login
function showLogin() {
  dashboardScreen.classList.remove('active');
  loginScreen.classList.add('active');
  loginForm.reset();
}

// File Selection Handler
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    uploadFile(file);
  }
}

// Drag and Drop Handlers
function handleDragOver(e) {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');

  const file = e.dataTransfer.files[0];
  if (file) {
    uploadFile(file);
  }
}

// Upload File
async function uploadFile(file) {
  // Validate file type
  const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
  const allowedExtensions = ['.pdf', '.txt', '.md'];
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    showUploadResult('error', 'Invalid file type. Please upload PDF, TXT, or MD files.');
    return;
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    showUploadResult('error', 'File too large. Maximum size is 10MB.');
    return;
  }

  // Reset UI
  uploadResult.style.display = 'none';
  uploadProgress.style.display = 'block';
  progressFilename.textContent = file.name;
  setProgress(0, 'Uploading...');

  const formData = new FormData();
  formData.append('file', file);

  try {
    // Simulate progress for better UX
    setProgress(10, 'Uploading file...');

    const response = await fetch(`${API_BASE}/api/admin/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    });

    setProgress(40, 'Chunking document...');
    await delay(500);

    setProgress(70, 'Generating embeddings...');
    await delay(500);

    setProgress(90, 'Indexing in Pinecone...');
    await delay(500);

    const data = await response.json();

    if (response.ok) {
      setProgress(100, 'Complete!');
      await delay(500);

      showUploadResult('success',
        `✅ Successfully uploaded ${file.name}!\n` +
        `📊 Created ${data.stats.chunks} chunks\n` +
        `🔢 Indexed ${data.stats.vectors} vectors\n` +
        `The chatbot knowledge base has been updated.`
      );

      // Refresh documents list
      loadDocuments();

      // Reset file input
      fileInput.value = '';
    } else {
      throw new Error(data.message || 'Upload failed');
    }
  } catch (error) {
    showUploadResult('error', `❌ Upload failed: ${error.message}`);
  } finally {
    uploadProgress.style.display = 'none';
  }
}

// Set Upload Progress
function setProgress(percent, status) {
  progressFill.style.width = `${percent}%`;
  progressStatus.textContent = status;
  progressMessage.textContent = `${percent}% complete`;
}

// Show Upload Result
function showUploadResult(type, message) {
  uploadResult.className = `upload-result ${type}`;
  uploadResult.textContent = message;
  uploadResult.style.display = 'block';

  // Auto-hide after 10 seconds for success
  if (type === 'success') {
    setTimeout(() => {
      uploadResult.style.display = 'none';
    }, 10000);
  }
}

// Load Documents
async function loadDocuments() {
  documentsLoading.style.display = 'block';
  documentsError.style.display = 'none';
  documentsTable.style.display = 'none';

  try {
    const response = await fetch(`${API_BASE}/api/admin/documents/list`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      displayDocuments(data.documents);
    } else {
      throw new Error(data.message || 'Failed to load documents');
    }
  } catch (error) {
    showError(documentsError, `Failed to load documents: ${error.message}`);
    documentsError.style.display = 'block';
  } finally {
    documentsLoading.style.display = 'none';
  }
}

// Display Documents
function displayDocuments(documents) {
  documentsTable.style.display = 'block';

  if (documents.length === 0) {
    documentsTableBody.innerHTML = '';
    noDocuments.style.display = 'block';
    return;
  }

  noDocuments.style.display = 'none';

  documentsTableBody.innerHTML = documents.map(doc => `
    <tr>
      <td>${escapeHtml(doc.name)}</td>
      <td>${formatFileSize(doc.size)}</td>
      <td>${formatDate(doc.created_at)}</td>
      <td>
        <button class="btn btn-danger btn-small" onclick="showDeleteModal('${escapeHtml(doc.name)}')">
          🗑️ Delete
        </button>
      </td>
    </tr>
  `).join('');
}

// Show Delete Modal
function showDeleteModal(filename) {
  currentDeleteFilename = filename;
  deleteMessage.textContent = `Are you sure you want to delete "${filename}"?`;
  deleteModal.style.display = 'flex';
}

// Handle Delete Confirmation
async function handleDeleteConfirm() {
  if (!currentDeleteFilename) return;

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

  try {
    const response = await fetch(`${API_BASE}/api/admin/documents/delete?filename=${encodeURIComponent(currentDeleteFilename)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      showUploadResult('success', `✅ Successfully deleted ${currentDeleteFilename}`);
      loadDocuments();
    } else {
      throw new Error(data.message || 'Delete failed');
    }
  } catch (error) {
    showUploadResult('error', `❌ Delete failed: ${error.message}`);
  } finally {
    deleteModal.style.display = 'none';
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Delete';
    currentDeleteFilename = null;
  }
}

// Utility Functions
function showError(element, message) {
  element.textContent = message;
  element.style.display = 'block';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Make showDeleteModal available globally
window.showDeleteModal = showDeleteModal;
