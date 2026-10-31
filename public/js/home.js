async function loadHome() {
  const featuredSlot = document.getElementById("featured-slot");
  const indexList = document.getElementById("index-list");
  const meta = document.getElementById("masthead-meta");
  const count = document.getElementById("archive-count");

  try {
    const [posts, stats] = await Promise.all([
      api("/api/posts?status=published"),
      api("/api/stats"),
    ]);

    meta.innerHTML = `${stats.published} entries published<br>${stats.drafts} in draft`;

    if (!posts.length) {
      featuredSlot.innerHTML = "";
      indexList.innerHTML =
        '<div class="empty">No published entries yet. Open the desk and write the first one.</div>';
      count.textContent = "0 entries";
      return;
    }

    const [featured, ...rest] = posts;

    featuredSlot.innerHTML = `
      <a class="featured" href="/post.html?slug=${encodeURIComponent(featured.slug)}">
        <span class="featured-no">Lead entry</span>
        <span>
          <h2>${escapeHtml(featured.title)}</h2>
          <p class="featured-excerpt">${escapeHtml(featured.excerpt)}</p>
          <span class="featured-meta">
            <span class="tag">${escapeHtml(featured.category)}</span>
            <span>${formatDate(featured.publishedAt)}</span>
            <span>${featured.readingMinutes} min read</span>
          </span>
        </span>
      </a>`;

    count.textContent = `${posts.length} entries`;

    if (!rest.length) {
      indexList.innerHTML = '<div class="empty">The lead entry is the only one so far.</div>';
      return;
    }

    indexList.innerHTML = rest
      .map(
        (p, i) => `
      <a class="index-row" href="/post.html?slug=${encodeURIComponent(p.slug)}">
        <span class="index-no">${entryNo(i + 1, posts.length)}</span>
        <span class="index-title">
          ${escapeHtml(p.title)}
          <small>${escapeHtml(p.excerpt)}</small>
        </span>
        <span class="index-tag">${escapeHtml(p.category)}</span>
        <span class="index-date">${formatDate(p.publishedAt)}</span>
      </a>`
      )
      .join("");
  } catch (err) {
    featuredSlot.innerHTML = "";
    indexList.innerHTML = `<div class="empty">Could not load the index — ${escapeHtml(err.message)}. Is the server running?</div>`;
    meta.textContent = "Index unavailable";
  }
}

loadHome();
