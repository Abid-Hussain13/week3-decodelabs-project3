const form = document.getElementById("post-form");
const errorBox = document.getElementById("form-error");
const titleInput = document.getElementById("title");
const excerptInput = document.getElementById("excerpt");
const bodyInput = document.getElementById("body");
const categorySelect = document.getElementById("category");
const statusSelect = document.getElementById("status");
const btnSubmit = document.getElementById("btn-save");
const eyebrow = document.getElementById("editor-eyebrow");
const heading = document.getElementById("editor-title");
const permalinkLabel = document.getElementById("permalink-label");

const editId = Number(new URLSearchParams(location.search).get("id")) || null;
let pendingCategoryId = null;
let saving = false;

function showError(errors) {
  if (!errors || !errors.length) {
    errorBox.classList.remove("visible");
    errorBox.innerHTML = "";
    return;
  }
  errorBox.innerHTML =
    "<strong>Check these fields</strong><ul>" +
    errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("") +
    "</ul>";
  errorBox.classList.add("visible");
  errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function loadCategories() {
  try {
    const cats = await api("/api/categories");
    categorySelect.innerHTML = cats
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join("");
    if (!cats.length) {
      categorySelect.innerHTML = '<option value="">No categories — run npm run db:seed</option>';
    }
    if (pendingCategoryId) categorySelect.value = String(pendingCategoryId);
  } catch (err) {
    categorySelect.innerHTML = '<option value="">Could not load categories</option>';
    showError([err.message]);
  }
}

function fillForm(post) {
  titleInput.value = post.title;
  excerptInput.value = post.excerpt;
  bodyInput.value = post.body;
  statusSelect.value = post.status;
  pendingCategoryId = post.categoryId;
  if (categorySelect.options.length) categorySelect.value = String(post.categoryId);
  permalinkLabel.textContent = "/" + post.slug;
  eyebrow.textContent = post.status === "published" ? "Editing published post" : "Editing draft";
  heading.textContent = "Edit post";
}

async function loadPost() {
  if (!editId) return;
  try {
    const post = await api(`/api/posts/id/${editId}`);
    fillForm(post);
  } catch (err) {
    showError([err.message]);
    heading.textContent = "Post unavailable";
  }
}

async function save() {
  if (saving) return;
  showError([]);

  const payload = {
    title: titleInput.value,
    excerpt: excerptInput.value,
    body: bodyInput.value,
    categoryId: Number(categorySelect.value),
    status: statusSelect.value || "draft",
  };

  const errors = [];
  if (!payload.title.trim() || payload.title.trim().length < 3) errors.push("Title must be at least 3 characters");
  if (payload.body.trim().length < 20) errors.push("Body must be at least 20 characters");
  if (!payload.categoryId) errors.push("Choose a category");
  if (errors.length) return showError(errors);

  saving = true;
  btnSubmit.disabled = true;
  const prevLabel = btnSubmit.textContent;
  btnSubmit.textContent = "Saving…";

  try {
    if (editId) {
      const post = await api(`/api/posts/${editId}`, { method: "PUT", body: payload });
      toast(post.status === "published" ? "Post published" : "Draft saved");
      statusSelect.value = post.status;
      permalinkLabel.textContent = "/" + post.slug;
      eyebrow.textContent = post.status === "published" ? "Editing published post" : "Editing draft";
    } else {
      const post = await api("/api/posts", { method: "POST", body: payload });
      toast(post.status === "published" ? "Post published" : "Draft saved");
      history.replaceState(null, "", `/editor.html?id=${post.id}`);
      setTimeout(() => location.reload(), 350);
      return;
    }
  } catch (err) {
    showError(err.details || [err.message]);
    toast(err.message || "Save failed", true);
  } finally {
    saving = false;
    btnSubmit.disabled = false;
    btnSubmit.textContent = prevLabel;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  save();
});

loadCategories().then(loadPost);
