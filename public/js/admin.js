async function loadStats() {
  try {
    const s = await api("/api/stats");
    document.getElementById("stat-total").textContent = s.total;
    document.getElementById("stat-pub").textContent = s.published;
    document.getElementById("stat-draft").textContent = s.drafts;
  } catch {
    /* non-critical */
  }
}

function renderPosts(posts) {
  const body = document.getElementById("posts-body");
  const empty = document.getElementById("empty-state");
  const table = document.getElementById("posts-table");

  if (!posts.length) {
    body.innerHTML = "";
    table.hidden = true;
    empty.hidden = false;
    return;
  }

  table.hidden = false;
  empty.hidden = true;

  body.innerHTML = posts
    .map(
      (p) => `
    <tr data-id="${p.id}">
      <td class="mono" style="color:var(--quiet)">${String(p.id).padStart(3, "0")}</td>
      <td>
        <a class="admin-title" href="/post.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>
        <div class="admin-slug">/${escapeHtml(p.slug)}</div>
      </td>
      <td><span class="badge">${escapeHtml(p.category)}</span></td>
      <td><span class="badge badge-${p.status}">${p.status}</span></td>
      <td class="mono" style="color:var(--quiet); font-size:0.6875rem">${formatDate(p.updatedAt)}</td>
      <td>
        <div class="row-actions">
          <a class="icon-btn" href="/editor.html?id=${p.id}">Edit</a>
          <button class="icon-btn danger" data-delete="${p.id}" data-title="${escapeHtml(p.title)}">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join("");
}

async function loadPosts() {
  const body = document.getElementById("posts-body");
  try {
    const posts = await api("/api/posts");
    renderPosts(posts);
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6"><div class="empty">Could not load posts — ${escapeHtml(err.message)}</div></td></tr>`;
  }
}

async function deletePost(id, title) {
  if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
  try {
    await api(`/api/posts/${id}`, { method: "DELETE" });
    toast("Entry deleted");
    await Promise.all([loadPosts(), loadStats()]);
  } catch (err) {
    toast(err.message || "Delete failed", true);
  }
}

document.getElementById("posts-body").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-delete]");
  if (!btn) return;
  deletePost(Number(btn.dataset.delete), btn.dataset.title);
});

loadStats();
loadPosts();
