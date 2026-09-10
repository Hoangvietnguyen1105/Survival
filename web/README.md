# NEON HORDE

Game **roguelike survivor** (kiểu Brotato / Vampire Survivors / Survivor.io) chạy trên nền web.
Không cần cài đặt gì, không cần Node.js, không phụ thuộc thư viện ngoài — toàn bộ đồ hoạ và âm thanh
đều được **sinh ra bằng code** ngay lúc chạy.

---

## 1. Chơi ngay

**Cách nhanh nhất:** mở file `dist/NeonHorde.html` bằng trình duyệt (Chrome / Edge / Firefox).
Chỉ 1 file duy nhất — double-click là chơi, kể cả khi không có mạng.

**Cách còn lại:** mở `index.html` (bản nhiều file, dùng khi bạn muốn sửa code).

> Trên một số máy, mở trực tiếp `index.html` bằng `file://` vẫn chạy bình thường vì game không dùng
> ES module. Nếu gặp trục trặc, cứ dùng `dist/NeonHorde.html`.

---

## 2. Cách chơi

| | |
|---|---|
| **Di chuyển — chuột** | **Giữ chuột trái**, nhân vật chạy tới con trỏ. Có vòng ngắm hiện ở đích |
| **Di chuyển — ngón tay** | **Chạm & kéo bất kỳ đâu** → hiện cần điều khiển ảo tại chỗ chạm |
| **Di chuyển — bàn phím** | `W A S D` hoặc phím mũi tên |
| **Tấn công** | **Tự động.** Vũ khí tự nhắm kẻ địch gần nhất. Việc của bạn là **né** |
| **Lướt (Dash)** | `Space` / `Shift` · **chuột phải** · nút **DASH** — **miễn thương** trong lúc lướt |
| **Tạm dừng** | `ESC` hoặc `P` · nút `II` góc phải |
| **Tắt/bật tiếng** | `M` |

**Vòng lặp game:**
1. Mỗi màn kéo dài 30–46 giây. Sống sót hết giờ là qua màn (hồi 18% máu + 1 nâng cấp miễn phí).
2. Nhặt **ngọc xanh** (EXP) để lên cấp → chọn 1 trong 3–4 thẻ nâng cấp.
3. **Trùm** xuất hiện ở màn 5, 10, 15… Phải giết trùm mới qua màn. Hạ trùm rơi **rương báu** (2 nâng cấp).
4. Chết là hết — chơi lại từ đầu (đúng chất roguelike).

**Vật phẩm rơi ra:** ❤️ hồi máu · 🪙 vàng (dùng để đổi bài nâng cấp, 30 vàng/lần) ·
🧲 nam châm (hút toàn bộ ngọc trên bản đồ) · ☢️ bom hạt nhân (xoá sạch màn hình).

**Tiến hoá vũ khí:** đưa 1 vũ khí lên **cấp tối đa (8)** và trang bị đi kèm của nó lên **cấp 3**
→ thẻ **TIẾN HOÁ** viền vàng sẽ xuất hiện. Cả 10 vũ khí đều **đổi hẳn cách hoạt động**, không phải chỉ tăng số:

| Vũ khí | Tiến hoá | Đổi thành gì |
|---|---|---|
| Súng Xung Kích | **ĐẠN PHÂN LIỆT** | Viên đạn nào hạ gục kẻ địch sẽ **tách thành 2 viên con tự truy đuổi**, lặp 3 đời → phản ứng dây chuyền |
| Súng Săn | **PHÁO HẠM** | Bỏ bắn chùm, nã **1 quả đạn pháo khổng lồ** bay chậm, xuyên tất cả, **rải chuỗi nổ dọc đường** |
| Kiếm Xoay | **THIÊN LUÂN** | **Hai vòng kiếm quay ngược chiều**, mỗi nhát chém bắn ra **sóng xung kích** |
| Lôi Kích | **LÔI VŨ** | Thôi lan truyền — **gọi 9 tia sét giáng từ trời**, mỗi chỗ để lại **vũng điện cháy 3 giây** |
| Bom Rải | **BOM HẠT NHÂN** | Nổ khổng lồ + 5 bom con + **hố phóng xạ cháy 5 giây** |
| Tia Tử Thần | **LĂNG KÍNH** | Laser **nảy 6 lần** giữa các kẻ địch, **mỗi lần nảy một màu cầu vồng** |
| Băng Vực | **BÃO TUYẾT VĨNH CỬU** | Thôi từng đợt — **bão tuyết bám theo bạn** suốt màn, làm chậm + gặm sát thương liên tục |
| Tên Lửa | **HOẢ TIỄN OANH TẠC** | **Loạt 14 quả** bay vòng cung lên trời rồi rơi rải khắp màn hình |
| Hào Quang | **LÒ PHẢN ỨNG** | Vùng **nở to theo số kẻ địch bên trong** và **phóng tia điện tới tất cả** |
| Phi Tiêu Hồi | **LƯỠI HÁI TỬ THẦN** | Bay mãi không về, **mỗi lần chém trúng lại to & mạnh thêm 9%** (tối đa 12 lần) |

---

## 3. Nội dung

- **5 nhân vật:** Vệ Binh (trâu), Xạ Thủ (bắn nhanh), Pháp Sư (sát thương diện rộng), Sát Thủ (chí mạng), Kỹ Sư (nhiều đạn).
- **10 vũ khí**, mỗi loại 8 cấp + 1 dạng tiến hoá: Súng Xung Kích, Súng Săn, Kiếm Xoay, Lôi Kích,
  Bom Rải, Tia Tử Thần, Băng Vực, Tên Lửa Tầm Nhiệt, Hào Quang Huỷ Diệt, Phi Tiêu Hồi.
- **14 trang bị bị động:** sát thương, tốc đánh, tốc chạy, máu, giáp, nam châm, chí mạng, hút máu, né, phạm vi…
- **5 Ấn Ký (buff 4 tầng)** — xem mục riêng bên dưới.
- **8 loại quái + quái tinh anh (elite)** với AI riêng: đuổi, bầy đàn, bắn xa, lao húc, nổ khi chết, tách đôi, bay vòng.
- **3 con trùm** với các đòn riêng: bắn toả tròn, bắn xoáy ốc, lao húc, triệu hồi, quét laser.
- Âm thanh & nhạc nền **sinh bằng WebAudio** — nhạc tự tăng độ dồn dập theo màn.

---

## 3b. ẤN KÝ — buff 4 tầng có điều kiện

Khác trang bị thường: mỗi Ấn Ký có **4 tầng**, và **tầng 4 bị khoá** cho tới khi bạn
đạt đủ một ngưỡng chỉ số. Mỗi Ấn tự cộng một ít đúng loại chỉ số nó cần — nhưng
**không bao giờ đủ một mình**, nên bạn buộc phải chủ động chọn trang bị tương ứng.
Nói cách khác: **chỉ số bạn chọn quyết định mở được tầng cuối của Ấn nào.**

Mang tối đa **3 Ấn** một lúc. Thẻ bài luôn ghi rõ điều kiện và con số hiện tại,
ví dụ `🔒 Tầng cuối: Tầm hút ≥ 250 (156)`. Khi đủ điều kiện, ô Ấn trên HUD sẽ
nhấp nháy vàng và thẻ **THỨC TỈNH** viền vàng bắt đầu xuất hiện.

| Ấn Ký | Điều kiện tầng 4 | Tầng 4 làm gì |
|---|---|---|
| **ẤN LÔI ĐÌNH** ⚡ | Tốc đánh ≥ 150% | Sét lan **12** mục tiêu, đổi màu **tím → trắng → vàng** và **mạnh dần +18%** sau mỗi lần nảy (thay vì yếu dần) |
| **ẤN HUYẾT NGUYỆT** 🌙 | Hút máu ≥ 5% | **Hành quyết** tức thì mọi kẻ địch dưới 25% máu; mỗi xác nổ thành **sóng máu** lan sang xung quanh |
| **ẤN BĂNG TINH** ❄ | Phạm vi ≥ 150% | Cứ 11 giây **đóng băng toàn màn hình** 2 giây; xác đóng băng **vỡ tan** thành mảnh băng xuyên thấu |
| **ẤN HƯ KHÔNG** 🕳 | Tầm hút ≥ 250 | **Hố đen khổng lồ** nuốt cả màn hình, khi tan thì **nổ siêu tân tinh** và hút sạch ngọc toàn bản đồ |
| **ẤN PHƯỢNG HOÀNG** 🔥 | Máu tối đa ≥ 200 | **Tái sinh**: lần đầu gục ngã sẽ sống lại với 60% máu, thiêu rụi toàn màn hình, bất tử 3 giây |

Ba tầng đầu của mỗi Ấn là hiệu ứng tăng dần bình thường (xem `js/sigils.js`).

Toàn bộ số liệu và hiệu ứng nằm gọn trong **`js/sigils.js`** — thêm Ấn mới chỉ cần
thêm một mục vào `SIGILS` với `req`, `apply`, `desc`, `icon` và các hook
(`onHit` / `afterHit` / `onKill` / `tick` / `dmgMul`).

---

## 4. Đưa game lên mạng (miễn phí)

**Cách dễ nhất — Netlify Drop:** vào <https://app.netlify.com/drop>, kéo thả **cả thư mục `neon-horde`**
vào trang. Vài giây sau bạn có một đường link chơi được trên mọi thiết bị.

**Hoặc GitHub Pages:** tạo repo, upload toàn bộ thư mục, vào *Settings → Pages* → chọn nhánh `main`.

**Hoặc itch.io:** nén thư mục thành `.zip`, tạo project mới dạng *HTML*, upload và tick
"This file will be played in the browser".

---

## 5. Cài lên điện thoại

### Cách 1 — PWA (không cần công cụ gì, khuyến nghị)

Sau khi đã đưa game lên mạng ở bước 4:

- **Android (Chrome):** mở link → menu `⋮` → **Thêm vào Màn hình chính**
- **iPhone (Safari):** mở link → nút Chia sẻ → **Thêm vào MH chính**

Game sẽ chạy toàn màn hình như app thật và **chơi được cả khi không có mạng**
(đã có `manifest.json` + `sw.js` lo phần này).

### Cách 2 — Đóng gói file APK / IPA thật (cần cài Node.js)

Máy bạn hiện **chưa có Node.js**. Nếu muốn ra file `.apk`, cài
[Node.js](https://nodejs.org) và [Android Studio](https://developer.android.com/studio) trước, rồi chạy
trong thư mục `neon-horde`:

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Neon Horde" "com.yourname.neonhorde" --web-dir=.
npx cap add android
npx cap sync
npx cap open android
```

Android Studio mở lên → **Build → Build Bundle(s)/APK(s) → Build APK(s)**.

> Cho iOS thì thay `@capacitor/android` bằng `@capacitor/ios` — nhưng bắt buộc phải có máy Mac.

---

## 6. Cấu trúc & cách chỉnh sửa

```
neon-horde/
├── index.html          Khung HTML + toàn bộ giao diện
├── styles.css          Giao diện, menu, thẻ nâng cấp, HUD
├── manifest.json       Cấu hình PWA (cài lên điện thoại)
├── sw.js               Service worker (chơi offline)
├── icon.svg            Icon app
├── build.ps1           Gộp tất cả thành 1 file → dist/
├── dist/
│   ├── NeonHorde.html  ★ Bản 1 file, double-click là chơi
│   └── embed.html      Bản nhúng (không có thẻ <html>)
└── js/
    ├── utils.js        Hàm toán, object pool, lưới không gian, lưu game
    ├── audio.js        Tổng hợp âm thanh + nhạc nền bằng WebAudio
    ├── gfx.js          Vẽ sprite bằng code, hạt lửa, camera, rung màn hình
    ├── input.js        Bàn phím, cần điều khiển ảo, tay cầm
    ├── data.js         ★ TOÀN BỘ SỐ LIỆU: nhân vật, vũ khí, trang bị, quái
    ├── sigils.js       ★ 5 Ấn Ký (buff 4 tầng) + hiệu ứng tầng cuối
    ├── entities.js     Người chơi, quái, đạn, vật phẩm
    ├── game.js         Vòng lặp chính, màn chơi, va chạm, sát thương
    ├── ui.js           Menu, thẻ nâng cấp, HUD, màn hình kết thúc
    └── main.js         Khởi động + vòng lặp render
```

### Muốn chỉnh độ khó / sức mạnh?

Gần như mọi con số đều nằm trong **`js/data.js`**:

- Máu, tốc độ, sát thương của quái → phần `ENEMIES`
- Sát thương và tốc bắn của vũ khí → hàm `stat: lv => ({...})` của từng vũ khí
- Chỉ số nhân vật → phần `CHARACTERS`
- Quái nào xuất hiện từ màn mấy → bảng `SPAWN_TABLE`

Vài chỗ khác trong `js/game.js`:

- `hpMul` trong `spawnEnemy()` — quái khoẻ lên nhanh cỡ nào theo màn
- `interval` / `batch` trong `updateWave()` — quái ra dồn dập cỡ nào
- `this.waveDur` trong `endWave()` — độ dài mỗi màn

Sửa xong nhớ chạy lại để cập nhật bản 1 file:

```powershell
powershell -ExecutionPolicy Bypass -File build.ps1
```

---

## 7. Ghi chú kỹ thuật

- Render bằng **Canvas 2D** với sprite được "nướng" sẵn (pre-baked) kèm hiệu ứng phát sáng,
  vẽ chồng ở chế độ `lighter` để tạo cảm giác neon. Không dùng thư viện đồ hoạ nào.
- **Object pool** + **lưới băm không gian** (spatial hash) cho va chạm — chịu được vài trăm quái
  cùng lúc. Đo thực tế: ~0.12 ms mỗi khung hình ở màn 5.
- Toàn bộ hẹn giờ trong game dùng **thời gian game**, nên tạm dừng và hiệu ứng quay chậm
  (slow-motion) không làm lệch nhịp màn chơi.
- Tự động dự phòng nếu `requestAnimationFrame` bị chặn (một số webview trên điện thoại).
- Kỷ lục được lưu bằng `localStorage`.
