document.addEventListener("DOMContentLoaded", () => {
  const categorySelect = document.getElementById("category-select");
  const newCategoryInput = document.getElementById("new-category");
  const saveBtn = document.getElementById("save-btn");
  const savedSnippetsContainer = document.getElementById("saved-snippets");
  const searchInput = document.getElementById("search-input");
  const downloadBtn = document.getElementById("download-btn");

  // Fetch and display categories on load
  function loadCategories() {
    chrome.storage.local.get({ categories: [] }, (data) => {
      const categories = data.categories;
      categorySelect.innerHTML = `
            <option value="" disabled selected>Select a category</option>
            <option value="add-new">Add New Category</option>
            ${categories
              .map((cat) => `<option value="${cat}">${cat}</option>`)
              .join("")}
          `;
    });
  }

  // Escape HTML special characters
  function escapeHtml(str) {
    return str.replace(
      /[&<>"'\/]/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
          "/": "&#x2F;",
        }[char])
    );
  }

  // Show or hide the "New Category" input
  categorySelect.addEventListener("change", () => {
    newCategoryInput.style.display =
      categorySelect.value === "add-new" ? "block" : "none";
  });

  // Save the snippet
  saveBtn.addEventListener("click", () => {
    const text = document.getElementById("save-text").value;
    const category =
      categorySelect.value === "add-new"
        ? newCategoryInput.value
        : categorySelect.value;

    // Validate input
    if (!text || !category) {
      alert("Please fill in both the text and category.");
      return;
    }

    // Save new category if created
    if (categorySelect.value === "add-new" && newCategoryInput.value) {
      chrome.storage.local.get({ categories: [] }, (data) => {
        const categories = data.categories;
        if (!categories.includes(newCategoryInput.value)) {
          categories.push(newCategoryInput.value);
          chrome.storage.local.set({ categories }, loadCategories);
        }
      });
    }

    // Get the current URL and save data to Chrome storage
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      chrome.storage.local.get({ savedItems: [] }, (data) => {
        const items = data.savedItems;
        items.push({ text, category, url });
        chrome.storage.local.set({ savedItems: items }, () => {
          alert("Snippet saved!");
          resetForm();
          displaySavedSnippets(); // Refresh the UI
        });
      });
    });
  });

  // Reset the form after saving
  function resetForm() {
    document.getElementById("save-text").value = "";
    if (categorySelect.value === "add-new") {
      newCategoryInput.value = "";
      newCategoryInput.style.display = "none";
    }
    categorySelect.value = "";
  }

  // Handle search input
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value;
    displaySavedSnippets(query);
  });

  // Handle filter type change (text/category/all)
  document.querySelectorAll('input[name="filter"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      searchInput.value = ""; // Clear search box when filter changes
      displaySavedSnippets(); // Refresh the display with all snippets
    });
  });

  // Function to display saved snippets
  function displaySavedSnippets(query = "") {
    const filterType = document.querySelector(
      'input[name="filter"]:checked'
    ).value;

    chrome.storage.local.get({ savedItems: [] }, (data) => {
      const items = data.savedItems;
      savedSnippetsContainer.innerHTML = ""; // Clear previous content

      // Filter items based on search query and selected filter type
      const filteredItems = items.filter((item) => {
        if (query) {
          query = query.toLowerCase();
          if (filterType === "text") {
            return item.text.toLowerCase().includes(query);
          } else if (filterType === "category") {
            return item.category.toLowerCase().includes(query);
          } else if (filterType === "all") {
            return (
              item.text.toLowerCase().includes(query) ||
              item.category.toLowerCase().includes(query)
            );
          }
        } else {
          return true; // Show all snippets if no query
        }
      });

      // Show message if no snippets found
      if (filteredItems.length === 0) {
        savedSnippetsContainer.innerHTML = "<p>No snippets found.</p>";
        return;
      }

      // Render filtered items
      filteredItems.forEach((item, index) => {
        const snippetDiv = document.createElement("div");
        snippetDiv.className = "snippet";
        snippetDiv.innerHTML = `
              <p><strong>Text:</strong> <pre>${escapeHtml(item.text)}</pre></p>
              <p><strong>Category:</strong> ${item.category}</p>
              <p><strong>URL:</strong> <a href="${item.url}" target="_blank">${
          item.url
        }</a></p>
              <button data-index="${index}" class="delete-btn">Delete</button>
            `;
        savedSnippetsContainer.appendChild(snippetDiv);
      });

      // Add delete functionality
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", (e) => {
          const index = e.target.dataset.index;
          deleteSnippet(index);
        });
      });
    });
  }

  // Function to delete a snippet
  function deleteSnippet(index) {
    chrome.storage.local.get({ savedItems: [] }, (data) => {
      const items = data.savedItems;
      items.splice(index, 1);
      chrome.storage.local.set({ savedItems: items }, () => {
        displaySavedSnippets();
      });
    });
  }

  // Function to download all snippets
  function downloadAllSnippets() {
    chrome.storage.local.get({ savedItems: [] }, (data) => {
      const items = data.savedItems;

      if (items.length === 0) {
        alert("No snippets to download.");
        return;
      }

      const snippetsString = items
        .map(
          (item) =>
            `Text: ${item.text}\nCategory: ${item.category}\nURL: ${item.url}\n\n`
        )
        .join("-".repeat(50) + "\n");

      const blob = new Blob([snippetsString], { type: "text/plain" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "snippets.txt";

      link.click();
    });
  }

  // Add event listener for the download button
  downloadBtn.addEventListener("click", downloadAllSnippets);

  // Display saved snippets when the popup opens
  displaySavedSnippets();

  // Load categories when the popup opens
  loadCategories();
});
