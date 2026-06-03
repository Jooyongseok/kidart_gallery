// ============================================================
// SNS Page — Instagram-style feed (Backend API)
// ============================================================
import { getCurrentUser, isLoggedIn } from '../utils/auth.js';
import { navigateTo } from '../router.js';
import { showToast } from '../components/navbar.js';
import { PostsAPI, CommentsAPI, LikesAPI, DMAPI, UsersAPI, FollowAPI } from '../services/api.js';

// Artwork image mapping (for posts with known artwork paths)
const artworkImages = {
  'public/artworks/rainbow_land.png': 'public/artworks/rainbow_land.png',
  'public/artworks/ocean_friends.png': 'public/artworks/ocean_friends.png',
  'public/artworks/spring_garden.png': 'public/artworks/spring_garden.png',
  'public/artworks/robot_kingdom.png': 'public/artworks/robot_kingdom.png',
  'public/artworks/dino_adventure.png': 'public/artworks/dino_adventure.png',
  'public/artworks/space_explore.png': 'public/artworks/space_explore.png',
  'public/artworks/cat_family.png': 'public/artworks/cat_family.png',
  'public/artworks/magic_forest.png': 'public/artworks/magic_forest.png',
  'public/artworks/rainbow_cake.png': 'public/artworks/rainbow_cake.png',
  'public/artworks/superhero.png': 'public/artworks/superhero.png',
  'public/artworks/pirate_ship.png': 'public/artworks/pirate_ship.png',
  'public/artworks/cloud_village.png': 'public/artworks/cloud_village.png',
  'public/artworks/dream_park.png': 'public/artworks/dream_park.png',
  'public/artworks/swirl_abstract.png': 'public/artworks/swirl_abstract.png',
  'public/artworks/night_city.png': 'public/artworks/night_city.png',
  'public/artworks/music_colors.png': 'public/artworks/music_colors.png',
  'public/artworks/sunwoo_dream_tree.png': 'public/artworks/sunwoo_dream_tree.png',
  'public/artworks/sunwoo_galaxy_whale.png': 'public/artworks/sunwoo_galaxy_whale.png',
  'public/artworks/sunwoo_candy_house.png': 'public/artworks/sunwoo_candy_house.png',
  'public/artworks/sunwoo_train_clouds.png': 'public/artworks/sunwoo_train_clouds.png',
  'public/artworks/sunwoo_dino_school.png': 'public/artworks/sunwoo_dino_school.png',
  'public/artworks/sunwoo_aurora.png': 'public/artworks/sunwoo_aurora.png',
};

function getPostImage(post) {
  if (post.image_path && post.image_path.startsWith('/uploads/')) return post.image_path;
  if (post.image_path && artworkImages[post.image_path]) return post.image_path;
  if (post.image_path) return post.image_path;
  return generatePlaceholder(post.color || '#8B5CF6', post.title);
}

function generatePlaceholder(color, title) {
  const cvs = document.createElement('canvas');
  cvs.width = 400; cvs.height = 300;
  const ctx = cvs.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 400, 300);
  grad.addColorStop(0, color);
  grad.addColorStop(1, shiftHue(color, 40));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 300);
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(80 + Math.sin(i * 1.5) * 150, 60 + Math.cos(i * 1.2) * 100, 30 + i * 15, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8;
  ctx.fillText(title, 200, 150);
  return cvs.toDataURL('image/png');
}

function shiftHue(hex, amt) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt / 2)},${b})`;
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(isoStr).toLocaleDateString('ko-KR');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let currentView = 'feed';
let selectedDMUser = null;
let cleanupFns = [];
let pendingUploadFile = null;

// ===== MAIN =====

export function renderSNS() {
  const content = document.getElementById('page-content');
  currentView = 'feed';
  selectedDMUser = null;
  cleanupFns = [];
  pendingUploadFile = null;

  content.innerHTML = `
    <div class="sns-page">
      <div class="sns-header">
        <h1 class="sns-header__title">KidArt SNS</h1>
        <p class="sns-header__sub">친구들의 작품을 구경하고, 좋아요와 댓글을 남겨보세요!</p>
        <div class="sns-header__tabs">
          <button class="sns-tab sns-tab--active" data-tab="feed">피드</button>
          <button class="sns-tab" data-tab="mypage">내 작품</button>
          <button class="sns-tab" data-tab="dm">메시지</button>
        </div>
      </div>
      <div class="sns-content">
        <div class="sns-feed" id="sns-feed"></div>
        <div class="sns-mypage hidden" id="sns-mypage"></div>
        <div class="sns-dm hidden" id="sns-dm"></div>
      </div>
    </div>
  `;

  bindTabs();
  renderFeed();

  return () => { cleanupFns.forEach(fn => fn()); cleanupFns = []; };
}

function bindTabs() {
  document.querySelectorAll('.sns-tab').forEach(tab => {
    const handler = () => {
      document.querySelectorAll('.sns-tab').forEach(t => t.classList.remove('sns-tab--active'));
      tab.classList.add('sns-tab--active');
      currentView = tab.dataset.tab;
      document.getElementById('sns-feed').classList.toggle('hidden', currentView !== 'feed');
      document.getElementById('sns-mypage').classList.toggle('hidden', currentView !== 'mypage');
      document.getElementById('sns-dm').classList.toggle('hidden', currentView !== 'dm');
      if (currentView === 'feed') renderFeed();
      else if (currentView === 'mypage') renderMyPage();
      else renderDMList();
    };
    tab.addEventListener('click', handler);
    cleanupFns.push(() => tab.removeEventListener('click', handler));
  });
}

// ===== FEED =====

async function renderFeed() {
  const container = document.getElementById('sns-feed');
  container.innerHTML = '<div class="sns-loading"><div class="spinner"></div> 로딩 중...</div>';

  try {
    const data = await PostsAPI.list(30);
    const user = getCurrentUser();
    container.innerHTML = `
      ${isLoggedIn() ? renderNewPostForm() : ''}
      <div class="sns-posts">
        ${data.posts.length === 0
          ? '<div class="sns-dm-empty"><p>아직 게시물이 없어요. 첫 번째로 올려보세요!</p></div>'
          : data.posts.map(post => renderPostCard(post, user)).join('')}
      </div>
    `;
    bindFeedEvents(container);
  } catch (err) {
    container.innerHTML = `<div class="sns-dm-empty"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderNewPostForm() {
  const user = getCurrentUser();
  return `
    <div class="sns-new-post glass-card">
      <div class="sns-new-post__header">
        <div class="sns-avatar sns-avatar--sm">🎨</div>
        <span>${escapeHtml(user.name)}</span>
      </div>
      <div class="sns-new-post__upload" id="new-post-upload-zone">
        <input type="file" id="new-post-image" accept="image/*" style="display:none">
        <div class="sns-upload-preview" id="new-post-preview" style="display:none">
          <img id="new-post-preview-img" src="" alt="미리보기">
          <button class="sns-upload-remove" id="new-post-remove-img" title="이미지 제거">&times;</button>
        </div>
        <div class="sns-upload-placeholder" id="new-post-upload-btn">
          <span>📷</span> 작품 이미지 첨부하기 (선택)
        </div>
      </div>
      <input type="text" id="new-post-title" class="sns-input sns-input--sm"
             placeholder="작품 제목" maxlength="100">
      <textarea class="sns-new-post__input" id="new-post-caption"
                placeholder="오늘의 작품을 공유해보세요..." maxlength="500"></textarea>
      <button class="btn btn--primary btn--sm" id="new-post-submit">게시하기</button>
    </div>
  `;
}

function renderPostCard(post, user) {
  const liked = user && post.likes.some(l => l.user_name === user.name);
  const img = getPostImage(post);
  const isMe = user && user.name === post.user_name;
  return `
    <article class="sns-post glass-card" data-post-id="${post.id}">
      <div class="sns-post__header">
        <div class="sns-avatar">${post.user_emoji}</div>
        <div class="sns-post__user-info">
          <strong class="sns-post__username" data-user-id="${post.user_id}" style="cursor:pointer">${escapeHtml(post.user_name)}</strong>
          <span class="sns-post__time">${timeAgo(post.created_at)}</span>
        </div>
        <div class="sns-post__header-actions">
          ${!isMe ? `
            <button class="sns-follow-btn sns-follow-btn--sm" data-follow-user-id="${post.user_id}"
                    data-follow-name="${escapeHtml(post.user_name)}">팔로우</button>
            <button class="sns-post__dm-btn" data-dm-user-id="${post.user_id}"
                    data-dm-user-name="${escapeHtml(post.user_name)}"
                    data-dm-emoji="${post.user_emoji}" title="메시지 보내기">&#9993;</button>
          ` : ''}
        </div>
      </div>
      <div class="sns-post__image"><img src="${img}" alt="${escapeHtml(post.title)}" loading="lazy"></div>
      <div class="sns-post__actions">
        <button class="sns-action ${liked ? 'sns-action--liked' : ''}"
                data-action="like" data-post-id="${post.id}">
          <span class="sns-action__icon">${liked ? '&#9829;' : '&#9825;'}</span>
          <span class="sns-action__count">${post.like_count}</span>
        </button>
        <button class="sns-action" data-action="comment" data-post-id="${post.id}">
          <span class="sns-action__icon">&#128172;</span>
          <span class="sns-action__count">${post.comment_count}</span>
        </button>
      </div>
      ${post.like_count > 0
        ? `<div class="sns-post__likes"><strong>${escapeHtml(post.likes[0]?.user_name || '')}</strong>${post.like_count > 1 ? ` 외 ${post.like_count - 1}명` : ''}이 좋아합니다</div>` : ''}
      <div class="sns-post__caption"><strong>${escapeHtml(post.user_name)}</strong> ${escapeHtml(post.caption)}</div>
      <div class="sns-post__comments" id="comments-${post.id}">
        ${post.comments.map(c => `
          <div class="sns-comment">
            <span class="sns-comment__emoji">${c.user_emoji}</span>
            <strong>${escapeHtml(c.user_name)}</strong>
            <span>${escapeHtml(c.text)}</span>
          </div>
        `).join('')}
      </div>
      ${isLoggedIn() ? `
        <div class="sns-post__comment-form">
          <input type="text" class="sns-comment-input" data-post-id="${post.id}"
                 placeholder="댓글 달기..." maxlength="300">
          <button class="sns-comment-submit" data-post-id="${post.id}">게시</button>
        </div>` : ''}
    </article>
  `;
}

function bindFeedEvents(container) {
  // Image upload
  const uploadBtn = document.getElementById('new-post-upload-btn');
  const fileInput = document.getElementById('new-post-image');
  const preview = document.getElementById('new-post-preview');
  const previewImg = document.getElementById('new-post-preview-img');
  const removeBtn = document.getElementById('new-post-remove-img');

  if (uploadBtn && fileInput) {
    const clickHandler = () => fileInput.click();
    uploadBtn.addEventListener('click', clickHandler);
    cleanupFns.push(() => uploadBtn.removeEventListener('click', clickHandler));

    const changeHandler = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      pendingUploadFile = file;
      const url = URL.createObjectURL(file);
      previewImg.src = url;
      preview.style.display = 'block';
      uploadBtn.style.display = 'none';
    };
    fileInput.addEventListener('change', changeHandler);
    cleanupFns.push(() => fileInput.removeEventListener('change', changeHandler));
  }

  if (removeBtn) {
    const rmHandler = () => {
      pendingUploadFile = null;
      previewImg.src = '';
      preview.style.display = 'none';
      uploadBtn.style.display = '';
      fileInput.value = '';
    };
    removeBtn.addEventListener('click', rmHandler);
    cleanupFns.push(() => removeBtn.removeEventListener('click', rmHandler));
  }

  // Like
  container.querySelectorAll('[data-action="like"]').forEach(btn => {
    const handler = async () => {
      if (!isLoggedIn()) { showToast('로그인 후 좋아요를 누를 수 있어요!', 'info'); return; }
      try {
        const result = await LikesAPI.toggle(btn.dataset.postId);
        const icon = btn.querySelector('.sns-action__icon');
        const count = btn.querySelector('.sns-action__count');
        icon.innerHTML = result.liked ? '&#9829;' : '&#9825;';
        count.textContent = result.like_count;
        btn.classList.toggle('sns-action--liked', result.liked);
      } catch (err) { showToast(err.message, 'error'); }
    };
    btn.addEventListener('click', handler);
    cleanupFns.push(() => btn.removeEventListener('click', handler));
  });

  // Comment focus
  container.querySelectorAll('[data-action="comment"]').forEach(btn => {
    const handler = () => {
      const input = container.querySelector(`.sns-comment-input[data-post-id="${btn.dataset.postId}"]`);
      if (input) input.focus();
      else if (!isLoggedIn()) showToast('로그인 후 댓글을 달 수 있어요!', 'info');
    };
    btn.addEventListener('click', handler);
    cleanupFns.push(() => btn.removeEventListener('click', handler));
  });

  // Comment submit
  container.querySelectorAll('.sns-comment-submit').forEach(btn => {
    const handler = () => submitComment(btn.dataset.postId);
    btn.addEventListener('click', handler);
    cleanupFns.push(() => btn.removeEventListener('click', handler));
  });
  container.querySelectorAll('.sns-comment-input').forEach(input => {
    const handler = (e) => { if (e.key === 'Enter') submitComment(input.dataset.postId); };
    input.addEventListener('keydown', handler);
    cleanupFns.push(() => input.removeEventListener('keydown', handler));
  });

  // Follow buttons
  container.querySelectorAll('.sns-follow-btn').forEach(btn => {
    const handler = async () => {
      if (!isLoggedIn()) { showToast('로그인이 필요합니다.', 'info'); return; }
      try {
        const result = await FollowAPI.toggle(btn.dataset.followUserId);
        btn.textContent = result.following ? '팔로잉' : '팔로우';
        btn.classList.toggle('sns-follow-btn--following', result.following);
        showToast(result.following ? `${btn.dataset.followName}님을 팔로우합니다` : '팔로우를 취소했습니다', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    };
    btn.addEventListener('click', handler);
    cleanupFns.push(() => btn.removeEventListener('click', handler));

    // Check initial follow state
    if (isLoggedIn()) {
      FollowAPI.isFollowing(btn.dataset.followUserId).then(r => {
        if (r.is_following) {
          btn.textContent = '팔로잉';
          btn.classList.add('sns-follow-btn--following');
        }
      }).catch(() => {});
    }
  });

  // Username click -> profile
  container.querySelectorAll('.sns-post__username').forEach(el => {
    const handler = () => renderUserProfile(parseInt(el.dataset.userId));
    el.addEventListener('click', handler);
    cleanupFns.push(() => el.removeEventListener('click', handler));
  });

  // DM button
  container.querySelectorAll('.sns-post__dm-btn').forEach(btn => {
    const handler = () => {
      if (!isLoggedIn()) { showToast('로그인이 필요합니다.', 'info'); return; }
      selectedDMUser = { id: parseInt(btn.dataset.dmUserId), name: btn.dataset.dmUserName, emoji: btn.dataset.dmEmoji };
      document.querySelectorAll('.sns-tab').forEach(t => t.classList.remove('sns-tab--active'));
      document.querySelector('.sns-tab[data-tab="dm"]').classList.add('sns-tab--active');
      document.getElementById('sns-feed').classList.add('hidden');
      document.getElementById('sns-dm').classList.remove('hidden');
      currentView = 'dm';
      renderDMList();
    };
    btn.addEventListener('click', handler);
    cleanupFns.push(() => btn.removeEventListener('click', handler));
  });

  // New post
  const submitBtn = document.getElementById('new-post-submit');
  if (submitBtn) {
    const handler = () => submitNewPost();
    submitBtn.addEventListener('click', handler);
    cleanupFns.push(() => submitBtn.removeEventListener('click', handler));
  }
}

async function submitComment(postId) {
  const input = document.querySelector(`.sns-comment-input[data-post-id="${postId}"]`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  try {
    await CommentsAPI.create(postId, text);
    showToast('댓글이 등록되었습니다!', 'success');
    renderFeed();
  } catch (err) { showToast(err.message, 'error'); }
}

async function submitNewPost() {
  const caption = document.getElementById('new-post-caption')?.value.trim();
  const title = document.getElementById('new-post-title')?.value.trim();
  if (!caption && !title) { showToast('캡션이나 제목을 입력해주세요!', 'error'); return; }

  const submitBtn = document.getElementById('new-post-submit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '업로드 중...'; }

  const hues = ['#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B', '#10B981', '#EF4444', '#3B82F6'];
  try {
    if (pendingUploadFile) {
      const formData = new FormData();
      formData.append('title', title || '무제');
      formData.append('caption', caption || `${title}을(를) 올렸어요!`);
      formData.append('color', hues[Math.floor(Math.random() * hues.length)]);
      formData.append('image', pendingUploadFile);
      await PostsAPI.createWithImage(formData);
    } else {
      await PostsAPI.create(title || '무제', caption || `${title}을(를) 올렸어요!`, null, hues[Math.floor(Math.random() * hues.length)]);
    }
    pendingUploadFile = null;
    showToast('게시물이 올라갔어요!', 'success');
    renderFeed();
  } catch (err) {
    showToast(err.message, 'error');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '게시하기'; }
  }
}

// ===== USER PROFILE (overlay) =====

async function renderUserProfile(userId) {
  const container = document.getElementById('sns-feed');
  container.innerHTML = '<div class="sns-loading"><div class="spinner"></div> 프로필 로딩 중...</div>';

  try {
    const [profile, postsData] = await Promise.all([
      UsersAPI.get(userId),
      PostsAPI.list(30, 0, userId),
    ]);
    const user = getCurrentUser();
    const isMe = user && user.id === userId;

    let followBtn = '';
    if (!isMe && isLoggedIn()) {
      const followStatus = await FollowAPI.isFollowing(userId);
      const isFollowing = followStatus.is_following;
      followBtn = `<button class="btn ${isFollowing ? 'btn--secondary' : 'btn--primary'} btn--sm sns-profile-follow"
                           data-user-id="${userId}">${isFollowing ? '팔로잉' : '팔로우'}</button>`;
    }

    // Get follower/following counts
    const [followersData, followingData] = await Promise.all([
      FollowAPI.followers(userId),
      FollowAPI.following(userId),
    ]);

    const posts = postsData.posts;
    container.innerHTML = `
      <div class="sns-profile-view">
        <button class="btn btn--ghost btn--sm sns-profile-back" id="profile-back">&#8592; 피드로 돌아가기</button>
        <div class="sns-profile">
          <div class="sns-profile__header glass-card">
            <div class="sns-profile__avatar">${profile.avatar_emoji}</div>
            <div class="sns-profile__info">
              <h2>${escapeHtml(profile.username)}</h2>
              ${profile.bio ? `<p class="sns-profile__bio">${escapeHtml(profile.bio)}</p>` : ''}
              <div class="sns-profile__stats">
                <span><strong>${profile.post_count}</strong> 작품</span>
                <span><strong>${followersData.followers.length}</strong> 팔로워</span>
                <span><strong>${followingData.following.length}</strong> 팔로잉</span>
                <span><strong>${profile.like_count}</strong> 좋아요</span>
              </div>
              ${followBtn}
            </div>
          </div>
          <div class="sns-profile__grid">
            ${posts.length === 0
              ? '<div class="sns-dm-empty"><p>아직 올린 작품이 없어요.</p></div>'
              : posts.map(post => {
                  const img = getPostImage(post);
                  return `
                    <div class="sns-profile__card">
                      <img src="${img}" alt="${escapeHtml(post.title)}" loading="lazy">
                      <div class="sns-profile__overlay">
                        <span>&#9829; ${post.like_count}</span>
                        <span>&#128172; ${post.comment_count}</span>
                      </div>
                      <div class="sns-profile__title">${escapeHtml(post.title)}</div>
                    </div>
                  `;
                }).join('')}
          </div>
        </div>
      </div>
    `;

    // Back button
    const backBtn = document.getElementById('profile-back');
    if (backBtn) {
      const handler = () => renderFeed();
      backBtn.addEventListener('click', handler);
      cleanupFns.push(() => backBtn.removeEventListener('click', handler));
    }

    // Follow button in profile
    const profileFollowBtn = container.querySelector('.sns-profile-follow');
    if (profileFollowBtn) {
      const handler = async () => {
        try {
          const result = await FollowAPI.toggle(userId);
          profileFollowBtn.textContent = result.following ? '팔로잉' : '팔로우';
          profileFollowBtn.className = `btn ${result.following ? 'btn--secondary' : 'btn--primary'} btn--sm sns-profile-follow`;
          showToast(result.following ? '팔로우했습니다!' : '팔로우를 취소했습니다', 'success');
        } catch (err) { showToast(err.message, 'error'); }
      };
      profileFollowBtn.addEventListener('click', handler);
      cleanupFns.push(() => profileFollowBtn.removeEventListener('click', handler));
    }
  } catch (err) {
    container.innerHTML = `<div class="sns-dm-empty"><p>${escapeHtml(err.message)}</p>
      <button class="btn btn--ghost btn--sm" onclick="document.getElementById('sns-feed').innerHTML='';(${renderFeed})()">피드로 돌아가기</button></div>`;
  }
}

// ===== MY PAGE =====

async function renderMyPage() {
  const container = document.getElementById('sns-mypage');
  if (!isLoggedIn()) {
    container.innerHTML = `<div class="sns-dm-empty"><p>로그인하면 내 작품을 볼 수 있어요!</p>
      <button class="btn btn--primary btn--sm" onclick="location.hash='/login'">로그인하기</button></div>`;
    return;
  }
  container.innerHTML = '<div class="sns-loading"><div class="spinner"></div> 로딩 중...</div>';
  try {
    const user = getCurrentUser();
    const [profile, postsData, followersData, followingData] = await Promise.all([
      UsersAPI.me(),
      PostsAPI.list(30, 0, user.id),
      FollowAPI.followers(user.id),
      FollowAPI.following(user.id),
    ]);
    const posts = postsData.posts;
    container.innerHTML = `
      <div class="sns-profile">
        <div class="sns-profile__header glass-card">
          <div class="sns-profile__avatar">${profile.avatar_emoji}</div>
          <div class="sns-profile__info">
            <h2>${escapeHtml(profile.username)}</h2>
            ${profile.bio ? `<p class="sns-profile__bio">${escapeHtml(profile.bio)}</p>` : ''}
            <div class="sns-profile__stats">
              <span><strong>${profile.post_count}</strong> 작품</span>
              <span><strong>${followersData.followers.length}</strong> 팔로워</span>
              <span><strong>${followingData.following.length}</strong> 팔로잉</span>
              <span><strong>${profile.like_count}</strong> 좋아요</span>
            </div>
          </div>
        </div>
        <div class="sns-profile__grid">
          ${posts.length === 0
            ? '<div class="sns-dm-empty"><p>아직 올린 작품이 없어요. 피드에서 게시해보세요!</p></div>'
            : posts.map(post => {
                const img = getPostImage(post);
                return `
                  <div class="sns-profile__card">
                    <img src="${img}" alt="${escapeHtml(post.title)}" loading="lazy">
                    <div class="sns-profile__overlay">
                      <span>&#9829; ${post.like_count}</span>
                      <span>&#128172; ${post.comment_count}</span>
                    </div>
                    <div class="sns-profile__title">${escapeHtml(post.title)}</div>
                  </div>
                `;
              }).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="sns-dm-empty"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

// ===== DM =====

async function renderDMList() {
  const container = document.getElementById('sns-dm');
  if (!isLoggedIn()) {
    container.innerHTML = `<div class="sns-dm-empty"><p>로그인 후 메시지를 주고받을 수 있어요!</p>
      <button class="btn btn--primary btn--sm" onclick="location.hash='/login'">로그인하기</button></div>`;
    return;
  }
  container.innerHTML = '<div class="sns-loading"><div class="spinner"></div></div>';
  try {
    const [convoData, usersData] = await Promise.all([
      DMAPI.conversations(),
      UsersAPI.list(),
    ]);
    const user = getCurrentUser();
    const convoMap = {};
    convoData.conversations.forEach(c => { convoMap[c.user_id] = c; });

    usersData.users.forEach(u => {
      if (u.id === user.id) return;
      if (!convoMap[u.id]) {
        convoMap[u.id] = { user_id: u.id, user_name: u.username, user_emoji: u.avatar_emoji, last_message: null, unread: 0 };
      }
    });

    const sorted = Object.values(convoMap).sort((a, b) => {
      if (a.last_message && b.last_message) return 0;
      return a.last_message ? -1 : b.last_message ? 1 : 0;
    });

    container.innerHTML = `
      <div class="sns-dm-layout">
        <div class="sns-dm-list">
          <div class="sns-dm-list__header"><h3>메시지</h3></div>
          ${sorted.map(conv => `
            <div class="sns-dm-contact ${selectedDMUser?.id === conv.user_id ? 'sns-dm-contact--active' : ''}"
                 data-dm-id="${conv.user_id}" data-dm-name="${escapeHtml(conv.user_name)}" data-dm-emoji="${conv.user_emoji}">
              <div class="sns-avatar sns-avatar--sm">${conv.user_emoji}</div>
              <div class="sns-dm-contact__info">
                <strong>${escapeHtml(conv.user_name)}</strong>
                <span class="sns-dm-contact__preview">${conv.last_message ? escapeHtml(conv.last_message) : '대화를 시작해보세요'}</span>
              </div>
              ${conv.unread > 0 ? `<span class="sns-dm-badge">${conv.unread}</span>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="sns-dm-chat" id="dm-chat-area">
          ${selectedDMUser ? '' : '<div class="sns-dm-empty"><p>대화할 친구를 선택해주세요</p></div>'}
        </div>
      </div>
    `;

    container.querySelectorAll('.sns-dm-contact').forEach(el => {
      const handler = () => {
        selectedDMUser = { id: parseInt(el.dataset.dmId), name: el.dataset.dmName, emoji: el.dataset.dmEmoji };
        container.querySelectorAll('.sns-dm-contact').forEach(c => c.classList.remove('sns-dm-contact--active'));
        el.classList.add('sns-dm-contact--active');
        renderDMConversation(selectedDMUser);
      };
      el.addEventListener('click', handler);
      cleanupFns.push(() => el.removeEventListener('click', handler));
    });

    if (selectedDMUser) renderDMConversation(selectedDMUser);
  } catch (err) {
    container.innerHTML = `<div class="sns-dm-empty"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function renderDMConversation(otherUser) {
  const chatArea = document.getElementById('dm-chat-area');
  if (!chatArea) return;
  chatArea.innerHTML = '<div class="sns-loading"><div class="spinner"></div></div>';

  try {
    const data = await DMAPI.messages(otherUser.id);
    const user = getCurrentUser();
    const msgs = data.messages;

    chatArea.innerHTML = `
      <div class="sns-dm-chat__header">
        <button class="sns-dm-back" id="dm-back-btn">&#8592;</button>
        <div class="sns-avatar sns-avatar--sm">${otherUser.emoji}</div>
        <strong>${escapeHtml(otherUser.name)}</strong>
      </div>
      <div class="sns-dm-chat__messages" id="dm-messages">
        ${msgs.length === 0
          ? '<div class="sns-dm-chat__empty">아직 대화가 없어요. 먼저 인사해보세요!</div>'
          : msgs.map(dm => `
              <div class="sns-dm-msg ${dm.sender_id === user.id ? 'sns-dm-msg--mine' : 'sns-dm-msg--theirs'}">
                <div class="sns-dm-msg__bubble">${escapeHtml(dm.text)}</div>
                <div class="sns-dm-msg__time">${timeAgo(dm.created_at)}</div>
              </div>
            `).join('')}
      </div>
      <div class="sns-dm-chat__input">
        <input type="text" id="dm-input" class="sns-input"
               placeholder="${escapeHtml(otherUser.name)}에게 메시지 보내기..." maxlength="500">
        <button class="btn btn--primary btn--sm" id="dm-send">전송</button>
      </div>
    `;

    const messagesEl = document.getElementById('dm-messages');
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

    const backBtn = document.getElementById('dm-back-btn');
    if (backBtn) {
      const handler = () => { selectedDMUser = null; renderDMList(); };
      backBtn.addEventListener('click', handler);
      cleanupFns.push(() => backBtn.removeEventListener('click', handler));
    }

    const sendBtn = document.getElementById('dm-send');
    const dmInput = document.getElementById('dm-input');
    const sendHandler = () => sendDM(otherUser);
    if (sendBtn) { sendBtn.addEventListener('click', sendHandler); cleanupFns.push(() => sendBtn.removeEventListener('click', sendHandler)); }
    if (dmInput) {
      const keyHandler = (e) => { if (e.key === 'Enter') sendDM(otherUser); };
      dmInput.addEventListener('keydown', keyHandler);
      cleanupFns.push(() => dmInput.removeEventListener('keydown', keyHandler));
      dmInput.focus();
    }
  } catch (err) {
    chatArea.innerHTML = `<div class="sns-dm-empty"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function sendDM(otherUser) {
  const input = document.getElementById('dm-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  try {
    await DMAPI.send(otherUser.id, text);
    renderDMConversation(otherUser);
  } catch (err) { showToast(err.message, 'error'); }
}
