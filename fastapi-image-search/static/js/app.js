// State
let currentItems = [];
let displayedItems = [];
let isLoading = false;
const ITEMS_PER_PAGE = 20;
let currentPage = 1;

// DOM Elements
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const imagesGrid = document.getElementById("imagesGrid");
const modal = document.getElementById("modal");
const relatedGrid = document.getElementById("relatedGrid");
const closeBtn = document.querySelector(".close");
const tagsContainer = document.getElementById("tagsContainer");

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  showLoading();
  try {
    await Promise.all([loadItems(), loadTags()]);
    setupEventListeners();
  } catch (error) {
    console.error("Initialization error:", error);
    imagesGrid.innerHTML =
      '<p class="error">Error loading. Please refresh.</p>';
  } finally {
    hideLoading();
  }
});

// Show loading state
function showLoading() {
  isLoading = true;
  if (imagesGrid && !imagesGrid.querySelector(".loading")) {
    imagesGrid.innerHTML =
      '<div class="loading">Loading fun images... 🎨</div>';
  }
}

// Hide loading state
function hideLoading() {
  isLoading = false;
}

// Load all items
async function loadItems() {
  try {
    const response = await fetch(`/api/items?skip=0&limit=${ITEMS_PER_PAGE}`);
    currentItems = await response.json();
    displayedItems = currentItems;
    displayItems(displayedItems);
  } catch (error) {
    console.error("Error loading items:", error);
    throw error;
  }
}

// Load tags
async function loadTags() {
  try {
    const response = await fetch("/api/tags?limit=10");
    const tags = await response.json();
    displayTags(tags);
  } catch (error) {
    console.error("Error loading tags:", error);
  }
}

// Display tags as buttons
function displayTags(tags) {
  if (!tagsContainer) return;

  tagsContainer.innerHTML = tags
    .map((tag) => `<button class="tag-btn" data-tag="${tag}">${tag}</button>`)
    .join("");

  tagsContainer.querySelectorAll(".tag-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      searchByTag(btn.dataset.tag);
    });
  });
}

// Display items in grid
function displayItems(items) {
  if (!imagesGrid) return;

  if (items.length === 0) {
    imagesGrid.innerHTML = '<p class="no-results">No items found 😢</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.dataset.itemId = item.id;
    card.dataset.type = item.type || "print";

    const img = document.createElement("img");
    img.src = item.thumbnail;
    img.alt = "Thumbnail";
    img.loading = "lazy";
    img.className = "item-thumbnail";

    const tagsDiv = document.createElement("div");
    tagsDiv.className = "item-tags";

    const tagsHtml = item.searches
      .slice(0, 3)
      .map((s) => `<span class="tag">${s.text}</span>`)
      .join("");
    tagsDiv.innerHTML = tagsHtml;

    card.appendChild(img);
    card.appendChild(tagsDiv);

    if (item.type === "collection") {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Collection";
      card.appendChild(badge);
    }

    card.addEventListener("click", () => showRelated(item.id, index));
    fragment.appendChild(card);
  });

  imagesGrid.innerHTML = "";
  imagesGrid.appendChild(fragment);

  // Add "Load more" button if there are more items
  if (currentItems.length > displayedItems.length) {
    const loadMoreBtn = document.createElement("button");
    loadMoreBtn.className = "load-more-btn";
    loadMoreBtn.textContent = "Load More 📚";
    loadMoreBtn.addEventListener("click", loadMore);
    imagesGrid.appendChild(loadMoreBtn);
  }
}

// Load more items
async function loadMore() {
  currentPage++;
  showLoading();
  try {
    const response = await fetch(
      `/api/items?skip=${currentPage * ITEMS_PER_PAGE}&limit=${ITEMS_PER_PAGE}`,
    );
    const newItems = await response.json();
    displayedItems = [...displayedItems, ...newItems];
    displayItems(displayedItems);
  } catch (error) {
    console.error("Error loading more items:", error);
  } finally {
    hideLoading();
  }
}

// Search items
async function searchItems(query) {
  if (!query.trim()) {
    displayedItems = currentItems.slice(0, ITEMS_PER_PAGE);
    currentPage = 1;
    displayItems(displayedItems);
    return;
  }

  showLoading();
  try {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(query)}&limit=${ITEMS_PER_PAGE}`,
    );
    const results = await response.json();
    displayedItems = results;
    displayItems(displayedItems);
  } catch (error) {
    console.error("Error searching:", error);
    imagesGrid.innerHTML =
      '<p class="error">Error searching. Please try again.</p>';
  } finally {
    hideLoading();
  }
}

// Search by tag
function searchByTag(tag) {
  searchInput.value = tag;
  searchItems(tag);
}

// Show related items
async function showRelated(itemId, index) {
  const item = displayedItems[index];
  if (!item) return;

  showLoading();
  try {
    if (item.type === "collection") {
      // Fetch related prints from API using database id
      const response = await fetch(`/api/related/${itemId}`);
      const prints = await response.json();
      displayRelated(prints);
      modal.classList.add("active");
    }
    // If it's a print, show its image
    else if (item.type === "print") {
      displayPrintImage(item);
      modal.classList.add("active");
    } else {
      alert("No items found 😅");
    }
  } catch (error) {
    console.error("Error loading items:", error);
    alert("Error loading items");
  } finally {
    hideLoading();
  }
}

// Display related items (prints from collection)
function displayRelated(items) {
  if (!relatedGrid) return;

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const relatedItem = document.createElement("div");
    relatedItem.className = "related-item";

    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.className = "related-link";

    const img = document.createElement("img");
    img.src = item.thumbnail;
    img.alt = "Print item";
    img.loading = "lazy";
    img.className = "related-thumbnail";

    const tagsDiv = document.createElement("div");
    tagsDiv.className = "related-tags";
    tagsDiv.innerHTML = item.searches
      .slice(0, 2)
      .map((s) => `<span class="tag">${s.text}</span>`)
      .join("");

    link.appendChild(img);
    relatedItem.appendChild(link);
    relatedItem.appendChild(tagsDiv);
    fragment.appendChild(relatedItem);
  });

  relatedGrid.innerHTML = "";
  relatedGrid.appendChild(fragment);
}

// Display single print image
function displayPrintImage(item) {
  if (!relatedGrid) return;

  relatedGrid.innerHTML = `
    <div class="print-image-container">
      <a href="${item.url}" target="_blank" class="print-link">
        <img src="${item.thumbnail}" alt="Print" class="print-image">
      </a>
      <div class="print-tags">
        ${item.searches.map((s) => `<span class="tag">${s.text}</span>`).join("")}
      </div>
      <button class="print-btn" data-url="${item.url}">Print this file 🖨️</button>
    </div>
  `;

  // Add click listener to print button
  const printBtn = relatedGrid.querySelector(".print-btn");
  if (printBtn) {
    printBtn.addEventListener("click", () =>
      handlePrintClick(printBtn.dataset.url),
    );
  }
}

// Handle print button click
async function handlePrintClick(url) {
  const printBtn = relatedGrid.querySelector(".print-btn");
  if (!printBtn) return;

  const originalText = printBtn.textContent;
  printBtn.textContent = "Sending to printer... ⏳";
  printBtn.disabled = true;

  try {
    const response = await fetch(
      `/api/print-image?url=${encodeURIComponent(url)}`,
    );
    if (!response.ok) {
      throw new Error("Failed to send to printer");
    }

    const result = await response.json();

    // Show success message
    printBtn.textContent = "Sent to printer! ✅";
    setTimeout(() => {
      printBtn.textContent = originalText;
      printBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error("Error handling print click:", error);
    alert("Error sending to printer. Please try again.");
    printBtn.textContent = originalText;
    printBtn.disabled = false;
  }
}

// Close modal
function closeModal() {
  modal.classList.remove("active");
  relatedGrid.innerHTML = "";
}

// Setup event listeners
function setupEventListeners() {
  searchBtn.addEventListener("click", () => searchItems(searchInput.value));
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchItems(searchInput.value);
    }
  });

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (adminModal.classList.contains("active")) {
        closeAdminModal();
      } else if (modal.classList.contains("active")) {
        closeModal();
      }
    }
  });

  // Tab toggle
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Admin event listeners
  setupAdminListeners();
}

// ---------------------------------------------------------------------------
// Admin UI
// ---------------------------------------------------------------------------

const adminModal = document.getElementById("adminModal");
const adminForm = document.getElementById("adminForm");
const adminTableBody = document.getElementById("adminTableBody");
const adminPagination = document.getElementById("adminPagination");
let adminPage = 0;
const ADMIN_PAGE_SIZE = 20;

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add("active");

  const searchView = document.getElementById("searchView");
  const searchHeader = document.getElementById("searchHeader");
  const adminView = document.getElementById("adminView");

  if (tab === "admin") {
    searchView.style.display = "none";
    searchHeader.style.display = "none";
    adminView.style.display = "block";
    loadAdminTable();
  } else {
    searchView.style.display = "block";
    searchHeader.style.display = "block";
    adminView.style.display = "none";
  }
}

async function loadAdminTable() {
  try {
    const response = await fetch(
      `/api/items?skip=${adminPage * ADMIN_PAGE_SIZE}&limit=${ADMIN_PAGE_SIZE}`,
    );
    const items = await response.json();
    renderAdminTable(items);
    renderAdminPagination();
  } catch (error) {
    console.error("Error loading admin table:", error);
    showToast("Error loading pages", true);
  }
}

function renderAdminTable(items) {
  if (!adminTableBody) return;
  adminTableBody.innerHTML = "";

  items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${item.thumbnail}" class="admin-thumb" alt=""></td>
      <td class="admin-url">${item.url}</td>
      <td>${item.type}</td>
      <td>${item.source || ""}</td>
      <td>${item.searches.map((s) => s.text).join(", ")}</td>
      <td class="admin-actions">
        <button class="admin-edit-btn" data-id="${item.id}">Edit</button>
        <button class="admin-delete-btn" data-id="${item.id}">Delete</button>
      </td>
    `;

    tr.querySelector(".admin-edit-btn").addEventListener("click", () =>
      openEditModal(item),
    );
    tr.querySelector(".admin-delete-btn").addEventListener("click", () =>
      confirmDelete(item.id),
    );

    adminTableBody.appendChild(tr);
  });
}

function renderAdminPagination() {
  if (!adminPagination) return;
  adminPagination.innerHTML = "";

  if (adminPage > 0) {
    const prevBtn = document.createElement("button");
    prevBtn.className = "admin-page-btn";
    prevBtn.textContent = "Prev";
    prevBtn.addEventListener("click", () => {
      adminPage--;
      loadAdminTable();
    });
    adminPagination.appendChild(prevBtn);
  }

  const pageLabel = document.createElement("span");
  pageLabel.className = "admin-page-label";
  pageLabel.textContent = `Page ${adminPage + 1}`;
  adminPagination.appendChild(pageLabel);

  const nextBtn = document.createElement("button");
  nextBtn.className = "admin-page-btn";
  nextBtn.textContent = "Next";
  nextBtn.addEventListener("click", () => {
    adminPage++;
    loadAdminTable();
  });
  adminPagination.appendChild(nextBtn);
}

function setupAdminListeners() {
  const addBtn = document.getElementById("addPageBtn");
  if (addBtn) addBtn.addEventListener("click", openAddModal);

  const closeBtn = document.getElementById("adminModalClose");
  if (closeBtn) closeBtn.addEventListener("click", closeAdminModal);

  const cancelBtn = document.getElementById("adminCancelBtn");
  if (cancelBtn) cancelBtn.addEventListener("click", closeAdminModal);

  if (adminModal) {
    adminModal.addEventListener("click", (e) => {
      if (e.target === adminModal) closeAdminModal();
    });
  }

  if (adminForm) {
    adminForm.addEventListener("submit", handleAdminSubmit);
  }
}

function openAddModal() {
  document.getElementById("adminModalTitle").textContent = "Add New Page";
  document.getElementById("editPageId").value = "";
  adminForm.reset();
  document.getElementById("formSource").value = "manual";
  adminModal.classList.add("active");
}

function openEditModal(item) {
  document.getElementById("adminModalTitle").textContent = "Edit Page";
  document.getElementById("editPageId").value = item.id;
  document.getElementById("formUrl").value = item.url;
  document.getElementById("formThumbnail").value = item.thumbnail;
  document.getElementById("formType").value = item.type;
  document.getElementById("formSource").value = item.source || "manual";
  document.getElementById("formTags").value = item.searches
    .map((s) => s.text)
    .join(", ");
  adminModal.classList.add("active");
}

function closeAdminModal() {
  adminModal.classList.remove("active");
  adminForm.reset();
}

async function handleAdminSubmit(e) {
  e.preventDefault();
  const pageId = document.getElementById("editPageId").value;
  const tagsRaw = document.getElementById("formTags").value;
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const data = {
    url: document.getElementById("formUrl").value,
    thumbnail: document.getElementById("formThumbnail").value,
    type: document.getElementById("formType").value,
    source: document.getElementById("formSource").value,
    tags,
  };

  try {
    let response;
    if (pageId) {
      response = await fetch(`/api/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Request failed");
    }

    showToast(pageId ? "Page updated" : "Page created");
    closeAdminModal();
    loadAdminTable();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function confirmDelete(pageId) {
  if (!confirm("Are you sure you want to delete this page?")) return;

  try {
    const response = await fetch(`/api/pages/${pageId}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      const err = await response.json();
      throw new Error(err.detail || "Delete failed");
    }
    showToast("Page deleted");
    loadAdminTable();
  } catch (error) {
    showToast(error.message, true);
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = isError ? "toast toast-error toast-show" : "toast toast-show";
  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}
