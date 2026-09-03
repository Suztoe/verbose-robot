(() => {
  const STORAGE_KEY = 'safeSNS';
  const MAX_POSTS = 200;
  const RATE_LIMIT_MS = 5000;
  const FILTER_PATTERNS = [
    /\b(殺す|死ね|消えろ|ブス|バカ|アホ|チビ|デブ)\b/,
    /\b(kill|die|stupid|idiot)\b/i
  ];

  const state = loadState();

  const authSection = document.getElementById('auth-section');
  const timelineSection = document.getElementById('timeline-section');
  const authForm = document.getElementById('auth-form');
  const handleInput = document.getElementById('handle-input');
  const currentHandle = document.getElementById('current-handle');
  const logoutBtn = document.getElementById('logout-btn');
  const postForm = document.getElementById('post-form');
  const postBody = document.getElementById('post-body');
  const charCount = document.getElementById('char-count');
  const postWarning = document.getElementById('post-warning');
  const postsContainer = document.getElementById('posts');
  const wipeBtn = document.getElementById('wipe-data');

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = raw ? JSON.parse(raw) : {};
    return {
      handle: base.handle || '',
      posts: base.posts || [],
      blocked: base.blocked || [],
      lastPostAt: base.lastPostAt || 0
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  }

  function now() {
    return new Date().toISOString();
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('ja-JP');
  }

  function isBlocked(handle) {
    return state.blocked.includes(handle);
  }

  function moderate(text) {
    for (const pattern of FILTER_PATTERNS) {
      if (pattern.test(text)) {
        return false;
      }
    }
    return true;
  }

  function renderAuth() {
    if (state.handle) {
      authSection.classList.add('hidden');
      timelineSection.classList.remove('hidden');
      currentHandle.textContent = `@${state.handle}`;
      renderPosts();
    } else {
      authSection.classList.remove('hidden');
      timelineSection.classList.add('hidden');
    }
  }

  function renderPosts() {
    postsContainer.innerHTML = '';
    const visible = state.posts.slice().reverse().filter(p => !isBlocked(p.author));

    if (visible.length === 0) {
      postsContainer.innerHTML = '<p>まだ投稿がありません。最初の投稿をしてみましょう。</p>';
      return;
    }

    for (const post of visible) {
      const el = document.createElement('article');
      el.className = 'post';
      el.innerHTML = `
        <div class="post-header">
          <span class="post-author">@${escapeHtml(post.author)}</span>
          <span class="post-time">${escapeHtml(formatTime(post.createdAt))}</span>
        </div>
        <p class="post-body">${escapeHtml(post.body)}</p>
        <div class="post-actions">
          <button class="small danger block-btn" data-handle="${escapeHtml(post.author)}">ブロック</button>
          <button class="small report-btn" data-id="${escapeHtml(post.id)}">通報</button>
        </div>
      `;
      postsContainer.appendChild(el);
    }

    postsContainer.querySelectorAll('.block-btn').forEach(btn => {
      btn.addEventListener('click', () => blockUser(btn.dataset.handle));
    });

    postsContainer.querySelectorAll('.report-btn').forEach(btn => {
      btn.addEventListener('click', () => reportPost(btn.dataset.id));
    });
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function blockUser(handle) {
    if (!confirm(`@${handle} をブロックしますか？今後このハンドルの投稿は非表示になります。`)) return;
    if (!state.blocked.includes(handle)) {
      state.blocked.push(handle);
      saveState();
      renderPosts();
    }
  }

  function reportPost(id) {
    const post = state.posts.find(p => p.id === id);
    if (!post) return;
    alert(`通報を受け付けました。投稿ID: ${id}\n\n通報はローカルに記録され、サーバーには送信されません。`);
  }

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const handle = handleInput.value.trim();
    if (!handle) return;
    state.handle = handle.slice(0, 32);
    saveState();
    renderAuth();
  });

  logoutBtn.addEventListener('click', () => {
    if (confirm('退出しますか？データは端末に残ります。')) {
      state.handle = '';
      saveState();
      renderAuth();
    }
  });

  postBody.addEventListener('input', () => {
    charCount.textContent = `${postBody.value.length} / 500`;
    postWarning.classList.add('hidden');
  });

  postForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const body = postBody.value.trim();
    if (!body) return;

    if (Date.now() - state.lastPostAt < RATE_LIMIT_MS) {
      postWarning.textContent = '連続投稿は5秒以上間隔をあけてください。';
      postWarning.classList.remove('hidden');
      return;
    }

    if (!moderate(body)) {
      postWarning.textContent = '不適切な表現が含まれている可能性があります。言葉を柔らかくしてみてください。';
      postWarning.classList.remove('hidden');
      return;
    }

    const post = {
      id: generateId(),
      author: state.handle,
      body: body.slice(0, 500),
      createdAt: now()
    };

    state.posts.unshift(post);
    if (state.posts.length > MAX_POSTS) state.posts.pop();
    state.lastPostAt = Date.now();
    saveState();

    postBody.value = '';
    charCount.textContent = '0 / 500';
    postWarning.classList.add('hidden');
    renderPosts();
  });

  wipeBtn.addEventListener('click', () => {
    if (confirm('端末に保存されているすべてのSafeSNSデータを削除しますか？この操作は元に戻せません。')) {
      localStorage.removeItem(STORAGE_KEY);
      state.handle = '';
      state.posts = [];
      state.blocked = [];
      state.lastPostAt = 0;
      renderAuth();
    }
  });

  renderAuth();
})();
