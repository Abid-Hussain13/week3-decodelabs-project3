async function loadHome() {
  const featuredSlot = document.getElementById("featured-slot");
  const indexList = document.getElementById("index-list");
  const count = document.getElementById("archive-count");

  try {
    const posts = await api("/api/posts?status=published");

    if (!posts.length) {
      featuredSlot.innerHTML = "";
      indexList.innerHTML = '<div class="empty">No posts published yet.</div>';
      count.textContent = "";
      return;
    }

    const [featured, ...rest] = posts;

    featuredSlot.innerHTML = `
      <a class="featured" href="/post.html?slug=${encodeURIComponent(featured.slug)}">
        <span class="featured-label">Latest post</span>
        <h2>${escapeHtml(featured.title)}</h2>
        <p class="featured-excerpt">${escapeHtml(featured.excerpt)}</p>
        <span class="featured-meta">
          <span class="tag">${escapeHtml(featured.category)}</span>
          <span>${formatDate(featured.publishedAt)}</span>
          <span>${featured.readingMinutes} min read</span>
        </span>
      </a>`;

    count.textContent = `${posts.length} posts`;

    if (!rest.length) {
      indexList.innerHTML = "";
      return;
    }

    indexList.innerHTML = rest
      .map(
        (p) => `
      <a class="index-row" href="/post.html?slug=${encodeURIComponent(p.slug)}">
        <span class="index-title">
          ${escapeHtml(p.title)}
          <small>${escapeHtml(p.excerpt)}</small>
          <span class="index-meta-mobile">
            <span>${escapeHtml(p.category)}</span>
            <span>${formatDate(p.publishedAt)}</span>
          </span>
        </span>
        <span class="index-tag">${escapeHtml(p.category)}</span>
        <span class="index-date">${formatDate(p.publishedAt)}</span>
      </a>`
      )
      .join("");
  } catch (err) {
    featuredSlot.innerHTML = "";
    indexList.innerHTML = `<div class="empty">Could not load posts — ${escapeHtml(err.message)}</div>`;
    count.textContent = "";
  }
}

loadHome();
