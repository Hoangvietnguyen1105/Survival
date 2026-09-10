/* NEON HORDE — service worker: chơi offline được, nhưng KHÔNG chặn bản cập nhật.
 *
 * ⚠️ BẪY ĐÃ TỪNG DÍNH — đừng đổi ngược lại:
 * Bản cũ dùng "cache-first" (có trong kho thì lấy trong kho, khỏi hỏi mạng) cộng với
 * tên kho cố định. Hậu quả: ai đã mở game một lần rồi thì VĨNH VIỄN thấy bản cũ,
 * dù đã đẩy bản mới lên máy chủ bao nhiêu lần. Sửa code xong deploy mà không ai thấy.
 *
 * Bản này dùng "network-first": còn mạng thì luôn lấy bản mới nhất từ máy chủ và
 * cập nhật kho; mất mạng mới lấy trong kho ra. Game nhẹ (~220KB) nên chờ mạng
 * không đáng kể, mà đổi lại deploy phát nào ăn phát đó.
 */
const CACHE = 'neon-horde-v2';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icon.svg',
  './js/utils.js',
  './js/audio.js',
  './js/gfx.js',
  './js/input.js',
  './js/data.js',
  './js/sigils.js',      // ⚠️ từng bị quên ở bản trước — thiếu file này là game trắng màn hình khi offline
  './js/entities.js',
  './js/game.js',
  './js/ui.js',
  './js/main.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => { /* offline lúc cài đặt — bỏ qua, lát nữa vào mạng sẽ tự lưu */ })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // chỉ lo phần của mình, đừng đụng vào yêu cầu sang tên miền khác
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        // lấy được bản mới -> lưu đè vào kho cho lần offline sau
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => { });
        return res;
      })
      .catch(() =>
        // mất mạng -> lấy trong kho; nếu là điều hướng trang thì trả về index.html
        caches.match(req).then(hit => hit || caches.match('./index.html'))
      )
  );
});
