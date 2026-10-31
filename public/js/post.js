function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

function renderMarkdown(text) {
  const lines = String(text).replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let para = [];
  let list = [];

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      html.push(`<ul>${list.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`);
      list = [];
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushAll();
      continue;
    }
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      flushAll();
      const tag = h[1].length === 3 ? "h3" : "h2";
      html.push(`<${tag}>${inline(h[2])}</${tag}>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      list.push(line.replace(/^[-*]\s+/, ""));
      continue;
    }
    flushList();
    para.push(line);
  }
  flushAll();
  return html.join("");
}

async function loadPost() {
  const root = document.getElementById("article-root");
  const slug = new URLSearchParams(location.search).get("slug");

  if (!slug) {
    root.innerHTML = `
      <div class="page-intro">
        <h1>Nothing to show here.</h1>
        <p>Pick a post from the home page to read it.</p>
      </div>
      <p style="padding: 2rem 0"><a class="back-link" href="/">← Back to home</a></p>`;
    return;
  }

  try {
    const post = await api(`/api/posts/${encodeURIComponent(slug)}`);
    if (post.status !== "published") {
      root.innerHTML = `
        <div class="page-intro">
          <p class="eyebrow">Draft — not published</p>
          <h1>${escapeHtml(post.title)}</h1>
          <p>This post is still a draft. Publish it to make it public.</p>
        </div>
        <p style="padding: 2rem 0">
          <a class="back-link" href="/editor.html?id=${post.id}">Edit post →</a>
          &nbsp;·&nbsp;
          <a class="back-link" href="/">← Back to home</a>
        </p>`;
      return;
    }

    document.title = `${post.title} — Quire`;

    root.innerHTML = `
      <article>
        <header class="article-top">
          <div class="article-kicker">
            <span class="tag">${escapeHtml(post.category)}</span>
            <span>${formatDate(post.publishedAt)}</span>
            <span>${post.readingMinutes} min read</span>
          </div>
          <h1>${escapeHtml(post.title)}</h1>
          <p class="article-dek">${escapeHtml(post.excerpt)}</p>
          <hr class="article-rule" />
        </header>
        <div class="prose">${renderMarkdown(post.body)}</div>
        <footer class="article-foot">
          <span>${escapeHtml(post.category)}</span>
          <a class="back-link" href="/">← Back to home</a>
        </footer>
      </article>`;
  } catch (err) {
    root.innerHTML = `
      <div class="page-intro">
        <h1>Post not found.</h1>
        <p>${escapeHtml(err.message)}. It may have been removed, or the link is wrong.</p>
      </div>
      <p style="padding: 2rem 0"><a class="back-link" href="/">← Back to home</a></p>`;
  }
}

loadPost();
