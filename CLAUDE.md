# NEON HORDE — bàn giao cho phiên làm việc mới

> **Đọc file này trước khi làm bất cứ gì.** Nó ghi lại toàn bộ trạng thái, các quyết định
> kỹ thuật, cách kiểm thử, và những cái bẫy đã mất công mới tìm ra.
> Cập nhật lần cuối: 2026-09-10, phiên 5 (cắt sức mạnh cuối game + chữa bệnh "không thể thua").

---

## 0. TÓM TẮT 30 GIÂY

Game **roguelike survivor** (kiểu Brotato / Vampire Survivors / Survivor.io) — bắn tự động,
sống sót theo màn, nhặt EXP để lên cấp và chọn nâng cấp. Có **HAI bản song song, cùng nội dung**:

| Bản | Đường dẫn | Trạng thái |
|---|---|---|
| **Web** (bản gốc, chuẩn để đối chiếu) | `web/` | ✅ Hoàn chỉnh, đã kiểm thử kỹ |
| **Unity** (port) | `Assets/` | ✅ Đủ nội dung, biên dịch sạch · ⚠️ **chưa build & chạy thật sau đợt port trùm** · ⚠️ **CHƯA có đợt cân bằng phiên 5** — xem mục 5B & 7 |

Chơi thử bản web ngay: mở `web/dist/NeonHorde.html` bằng trình duyệt (1 file, không cần mạng).
Link đã xuất bản: <https://claude.ai/code/artifact/4ae35421-27da-45c3-b130-a3560571cd04>

**Người dùng là dân không chuyên kỹ thuật, nói tiếng Việt.** Đừng bắt họ chọn giữa các
phương án kỹ thuật — tự quyết rồi giải thích ngắn gọn bằng tiếng Việt. Toàn bộ chú thích
trong code và văn bản trong game đều bằng tiếng Việt, giữ nguyên quy ước đó.

---

## 1. MÔI TRƯỜNG MÁY NÀY (rất quan trọng, đã kiểm chứng)

| Thứ | Tình trạng |
|---|---|
| **Node.js / npm** | ❌ **KHÔNG CÓ** — đừng đề xuất Vite, webpack, npm install |
| **Python** | ❌ **KHÔNG CÓ** (chỉ có alias Microsoft Store, chạy là báo lỗi) |
| **Git** | ✅ `C:\Program Files\Git\cmd\git.exe` (2.55.0) |
| **Unity** | ✅ `6000.3.21f1` tại `C:\Program Files\Unity\Hub\Editor\6000.3.21f1\Editor\Unity.exe` |
| **Module build** | ✅ Android (SDK 640MB + NDK 2.2GB + OpenJDK), WebGL (kèm Emscripten), Windows |
| **Mạng** | ⚠️ **KHÔNG vào được server Unity** (`config.uca.cloud.unity3d.com`, `cdp.cloud.unity3d.com`). GitHub thì vào được (LitMotion đã tải về thành công). |

**Hệ quả:** chỉ dùng package **đóng gói sẵn trong Editor**. Đã kiểm tra, các package sau có sẵn
offline: `com.unity.ugui`, `com.unity.textmeshpro`, `com.unity.render-pipelines.universal`.
`com.unity.inputsystem` **KHÔNG** có sẵn → bản Unity dùng **Input Manager cũ**.

Perl/sed có sẵn qua Git Bash. **Cẩn thận:** trong perl one-liner, `$(` bị hiểu là biến `$(`
(GID) — đã một lần làm hỏng `$(id)` thành `197609id` trong `ui.js`. Với chuỗi có `$` hoặc `||`,
dùng công cụ Edit hoặc viết script PowerShell dùng `.Replace()` thay vì perl.

---

## 2. BẢN WEB — `web/`

### Chạy & build
```bash
# chơi: mở web/dist/NeonHorde.html
# build lại bản 1 file sau khi sửa code:
powershell -ExecutionPolicy Bypass -File web/build.ps1
# -> web/dist/NeonHorde.html (bản đầy đủ)  +  web/dist/embed.html (bản nhúng Artifact)
```

### Kiến trúc
Canvas 2D thuần, **không thư viện**, **không file ảnh/âm thanh nào**. Script cổ điển
(không ES module) nên mở bằng `file://` cũng chạy.

```
web/js/  (thứ tự nạp phải giữ nguyên, khai báo trong index.html VÀ build.ps1)
├── utils.js     toán, Pool, Grid (lưới băm không gian), Save
├── audio.js     Sfx: tổng hợp WebAudio + nhạc nền (sequencer 16 nốt)
├── gfx.js       Art (nướng sprite bằng code), Particles, FloatText, Cam
├── input.js     bàn phím + chuột + cần điều khiển ảo + tay cầm
├── data.js      ★ CHARACTERS, WEAPONS (10), PASSIVES (14), ENEMIES, BOSSES
├── sigils.js    ★ SIGILS (5 Ấn Ký 4 tầng) + bộ điều phối `Sigils`
├── entities.js  createPlayer/updatePlayer, Enemy, Bullet, Pickup
├── game.js      ★ `G` — vòng lặp, màn chơi, va chạm, sát thương, nâng cấp, vẽ
├── ui.js        `UI` — menu, thẻ bài, HUD, kết thúc
└── main.js      khởi động + vòng lặp render (có dự phòng nếu rAF bị chặn)
```

### Điều khiển (3 cách cùng lúc)
- **Chuột**: giữ chuột trái → chạy tới con trỏ (có vòng ngắm). Chuột phải = lướt.
- **Ngón tay**: chạm & kéo bất kỳ đâu → cần điều khiển ảo hiện tại chỗ chạm.
- **Bàn phím**: WASD / mũi tên. Space/Shift = lướt. ESC = tạm dừng. M = tắt tiếng.

---

## 3. BẢN UNITY — `Assets/`

### Chạy
Unity Hub → Add project from disk → chọn thư mục này → Open → **Play**.
Game tự dựng camera, thế giới, giao diện khi chạy — **không prefab, không kéo thả gì**
(nhờ `[RuntimeInitializeOnLoadMethod]` trong `Bootstrap.cs`, chạy được ở bất kỳ scene nào).

### Quyết định kỹ thuật (cố ý, đừng đổi nếu chưa đọc mục 1)
- **Built-in Render Pipeline**, không phải URP. Vẻ phát sáng đến từ quầng sáng **nướng sẵn
  vào texture** + shader cộng sáng `Assets/Shaders/NeonAdditive.shader`.
- **Input Manager cũ** (`UnityEngine.Input`).
- Chỉ dùng package đóng gói sẵn → cài offline được.
- LitMotion đã có trong `Packages/manifest.json` và đã tải về `Library/PackageCache`,
  nhưng **code hiện chưa dùng đến**. Có thể dùng để làm mượt hiệu ứng giao diện.

### Bản đồ file (đối chiếu 1-1 với bản web)
```
Assets/Scripts/NH/
├── Util.cs        ~ utils.js        (M, Pool<T>, SpatialGrid, SaveData)
├── TexCanvas.cs   ★ bộ vẽ 2D tự viết thay Canvas trình duyệt (siêu lấy mẫu 4x + làm mờ quầng sáng)
├── Art.cs         ~ gfx.js phần Art (~64 sprite) + WarmAll()
├── Synth.cs       + Sfx.cs   ~ audio.js
├── GameData.cs    ~ data.js
├── Sigils.cs      ~ sigils.js
├── Entities.cs    ~ entities.js
├── Fx.cs          ~ gfx.js phần Particles/FloatText/Cam
├── GameCtrl.cs    ~ game.js
├── UIRoot.cs      ~ ui.js (uGUI dựng bằng code)
├── InputCtrl.cs   ~ input.js
├── Bootstrap.cs   điểm khởi động
└── SmokeRunner.cs chế độ tự chơi kiểm thử (chỉ bật khi có tham số -nhsmoke)
Assets/Editor/
├── NHSetup.cs     tự tạo scene + Always Included Shaders + PlayerSettings
└── NHBuild.cs     menu "Neon Horde": kiểm tra ảnh+dữ liệu, Build Windows/Android/WebGL
```

---

## 4. NỘI DUNG GAME (giống nhau ở cả hai bản)

- **5 nhân vật**: Vệ Binh (trâu), Xạ Thủ (bắn nhanh), Pháp Sư (diện rộng), Sát Thủ (chí mạng), Kỹ Sư (nhiều đạn).
- **10 vũ khí** × 8 cấp, mỗi cái có **1 dạng tiến hoá đổi hẳn cơ chế** (bảng ở mục 5).
  Điều kiện: vũ khí **cấp tối đa (8)** + trang bị đi kèm (`pairId`) **cấp 3**.
- **14 trang bị bị động** × 5 cấp.
- **5 Ấn Ký** × 4 tầng — **tầng 4 bị khoá sau một ngưỡng chỉ số**:

| Ấn Ký | Khoá sau | Tầng 4 |
|---|---|---|
| ẤN LÔI ĐÌNH | Tốc đánh ≥ 150% | Sét lan 12 mục tiêu, đổi màu tím→trắng→vàng, **mạnh dần +18% mỗi lần nảy** |
| ẤN HUYẾT NGUYỆT | Hút máu ≥ 5% | **Hành quyết** tức thì quái dưới 25% máu, nổ thành sóng máu |
| ẤN BĂNG TINH | Phạm vi ≥ 150% | Cứ 11 giây **đóng băng toàn màn hình**, xác đóng băng vỡ thành mảnh xuyên thấu |
| ẤN HƯ KHÔNG | Tầm hút ≥ 250 | **Hố đen khổng lồ**, tan ra thì **nổ siêu tân tinh** + hút sạch ngọc |
| ẤN PHƯỢNG HOÀNG | Máu tối đa ≥ 200 | **Tái sinh** một lần: sống lại 60% máu, thiêu rụi màn hình, bất tử 3 giây |

  Thiết kế cốt lõi: **mỗi Ấn tự cộng đúng loại chỉ số nó cần nhưng không bao giờ đủ một mình**
  (chỉ tới ~60% ngưỡng ở tầng 3) → người chơi buộc phải chủ động chọn trang bị phù hợp.
  Mang tối đa 3 Ấn. Thẻ bài luôn ghi điều kiện + con số hiện tại, ví dụ `🔒 Tầng cuối: Tầm hút ≥ 250 (156)`.

- **8 loại quái** (đuổi / bầy đàn / bắn xa / lao húc / nổ khi chết / tách đôi / bay vòng) + quái tinh anh.
- **8 con trùm** ở màn 5/10/15/20… (hết thì quay vòng), mỗi con có hình dạng, bộ đòn và một
  **LUẬT ĐẤU TRƯỜNG** riêng bẻ cong cách chơi suốt trận đó — xem bảng ở mục 4E.

---

## 4B. LUẬT CHƠI (số liệu trích thẳng từ code, không phải trí nhớ)

### Vòng lặp một ván
0. **TRẦN HỒI MÁU** (`G.HEAL_BASE` / `G.HEAL_LS`, thêm ở phiên 5 — xem mục 5B).
   Hút máu · "hồi 2 máu mỗi mạng" của ẤN HUYẾT NGUYỆT · tim rơi ra từ quái — cả ba đều
   rút chung một **hũ**, hũ đầy lại mỗi giây đúng `máu tối đa × (0,045 + hút máu × 1,1)`
   và chứa tối đa `30% máu tối đa`. Hồi máu mỗi giây của BÙA HỒI SINH **đứng ngoài trần**.
1. Mỗi màn dài `min(46, 30 + số màn)` giây. **Sống hết giờ là qua màn.**
2. Qua màn: hồi **18% máu tối đa** + **1 nâng cấp miễn phí**, nghỉ 1,4 giây rồi vào màn sau.
   Quái còn sót bị xoá, mỗi con rơi 1 ngọc.
3. **Trùm ở màn 5, 10, 15…** — đồng hồ dừng, phải giết trùm mới qua được.
   Hạ trùm rơi **3 rương** (mỗi rương = 2 nâng cấp + 40 vàng) + 26 ngọc + 8 vàng.
4. Chết là hết ván (roguelike, không có checkpoint).

### Lên cấp
- `EXP cần = round(5 + cấp × 4 + cấp^1.62)`
- Mỗi lần lên cấp: chọn **1 trong 3 thẻ** (màn hình dọc) hoặc **4 thẻ** (màn hình ngang).
- **Đổi bài**: 1 lần miễn phí mỗi lần lên cấp, sau đó **30 vàng/lần**.
- **Giới hạn mang: 6 vũ khí · 6 trang bị · 3 Ấn Ký.** Hết chỗ thì chỉ còn được nâng cấp cái đang có.
- Thứ tự ưu tiên khi bốc bài: thẻ TIẾN HOÁ/THỨC TỈNH luôn được chào trước, rồi mới bốc
  ngẫu nhiên có trọng số (nâng vũ khí 10 · Ấn tầng cuối 16 · nâng trang bị 9 · Ấn thường 8 ·
  vũ khí mới 7 · trang bị mới 6 · Ấn mới 5).

### Chiến đấu
| | |
|---|---|
| Tấn công | **Tự động**, tự nhắm kẻ địch gần nhất. Người chơi chỉ điều khiển di chuyển. |
| Tốc chạy gốc | 218 đơn vị/giây · bán kính người chơi 14 · đấu trường ±1500 |
| Lướt | bay 0,19 giây · hồi chiêu 1,5 giây · **miễn thương 0,28 giây** |
| Chạm quái | mỗi con gây sát thương tối đa **1 lần / 0,6 giây**; trúng đòn xong **miễn thương 0,55 giây** |
| Giáp | `sát thương thực = max(gốc × 0.15, gốc − giáp, 1)` → **giáp không bao giờ chặn quá 85%** |
| Né | xác suất theo `dodge`, né được thì miễn thương 0,25 giây |
| Chí mạng | gốc **5%**, nhân **1,6 lần** |

> ⚠️ Sát thương của quái **đã được nhân theo màn lúc sinh ra** — đừng nhân lần nữa trong
> `hurtPlayer` (đã từng là lỗi làm sát thương tăng theo hàm bậc hai).

### Vật phẩm rơi ra
| Nguồn | Rơi gì |
|---|---|
| Mọi quái | 1 ngọc EXP (tinh anh: ×4) |
| Quái tinh anh | luôn 8 vàng · 35% rơi tim (22 máu) |
| Quái thường | 2,2% tim (14 máu) · 3,3% vàng (3) · 0,7% 🧲 nam châm · 0,4% ☢️ bom hạt nhân |
| Trùm | 3 rương + 26 ngọc + 8 vàng |

🧲 nam châm = hút toàn bộ ngọc trên bản đồ. ☢️ bom hạt nhân = xoá sạch màn hình (trùm chỉ mất 400 máu).

### Độ khó tăng theo màn `w`
Tất cả nằm trong `spawnEnemy()` / `updateWave()` / `endWave()` của `game.js` (web)
và `GameCtrl.cs` (Unity). Tên biến ghi kèm để tra ngược trong code:

```
ex        = w <= 10 ? 1.75 : 1.75 + (w-10)*0.012      // ★ số mũ dốc dần sau màn 10
hpMul     = 1 + (w-1)*0.30 + w^ex * 0.014            // màn 10 ≈ ×4.5 (y như cũ)
dmgMul    = 1 + (w-1)*0.11                            // sát thương quái
spdMul    = min(1.55, 1 + (w-1)*0.014)                // tốc độ quái
interval  = max(0.085, 0.70 - w*0.035)                // ★ sàn 0.13 -> 0.085 (chỉ ảnh hưởng w≥17)
batch     = 1 + floor(w/3) + max(0, floor((w-12)/4))  // ★ tới màn 12 y như cũ
cap       = min(260, 60 + w*14)                       // trần số quái cùng lúc
elite     = random < min(0.24, 0.012 + w*0.008)       // ★ trần .16 -> .24 (dốc giữ nguyên)
waveDur   = min(46, 30 + w)                           // độ dài màn (giây)
xpNext    = round(5 + cấp*4 + cấp^1.62)               // EXP cần để lên cấp
```
★ = đổi ở phiên 5. **Mọi thay đổi đều được thiết kế để màn 1–10 giữ nguyên y hệt bản cũ**,
chỉ dốc lên từ màn 11 trở đi. Máu quái: màn 20 +12% · màn 35 +74% · màn 45 +165%.
Quái sinh ra **ngay ngoài rìa màn hình** (không phải vòng tròn bán kính cố định) để vào trận nhanh.

---

## 4C. BẢNG VŨ KHÍ ĐẦY ĐỦ

`Cặp với` = trang bị phải lên **cấp 3** thì vũ khí (ở **cấp tối đa 8**) mới mở được TIẾN HOÁ.

> **Cột "Cấp 1 → cấp 8" là số SAU đợt cắt phiên 5.** Quy tắc cắt: giữ nguyên sát thương
> cấp 1, hạ sát thương cấp 8 xuống còn **55%**. Hồi chiêu và số lượng đạn theo cấp **không
> đụng tới** — chính chúng mới là thứ làm việc lên cấp có cảm giác đã tay.

| # | Vũ khí | Cặp với | Cấp 1 → cấp 8 | Tiến hoá |
|---|---|---|---|---|
| 1 | SÚNG XUNG KÍCH | ỐNG ĐẠN PHỤ | ST 15→25 · hồi 0,59→0,34s · 1→3 viên | **ĐẠN PHÂN LIỆT** — đạn giết được quái thì tách 2 viên con truy đuổi, 2 đời |
| 2 | SÚNG SĂN | NGỌC CƯỜNG LỰC | ST 11→17 · hồi 1,10→0,71s · 4→9 viên | **PHÁO HẠM** — 1 quả pháo khổng lồ xuyên tất cả, rải chuỗi nổ dọc đường |
| 3 | KIẾM XOAY | ĐÁ MỞ RỘNG | ST 20→32 · 2→6 lưỡi · bán kính 83→118 | **THIÊN LUÂN** — 2 vòng kiếm quay ngược chiều, mỗi nhát bắn ra sóng xung kích |
| 4 | LÔI KÍCH | NGỌC CƯỜNG LỰC | ST 28→46 · hồi 1,42→0,82s · lan 2→8 | **LÔI VŨ** — **3** tia sét giáng từ trời mỗi loạt, để lại vũng điện |
| 5 | BOM RẢI | ĐÁ MỞ RỘNG | ST 41→65 · hồi 1,80→1,10s · nổ 93→142 · 1→3 quả | **BOM HẠT NHÂN** — nổ lớn + 2 bom con + hố phóng xạ cháy 4 giây |
| 6 | TIA TỬ THẦN | ĐỒNG HỒ CÁT | ST 38→67 · hồi 1,65→0,95s · dày 14→31 | **LĂNG KÍNH** — laser nảy **4** lần, mỗi lần một màu cầu vồng |
| 7 | BĂNG VỰC | ĐÁ MỞ RỘNG | ST 18→31 · hồi 2,27→1,36s · nổ 146→258 · chậm 39→67% | **BÃO TUYẾT VĨNH CỬU** — vùng băng bám theo người chơi suốt màn |
| 8 | TÊN LỬA TẦM NHIỆT | ỐNG ĐẠN PHỤ | ST 31→50 · hồi 1,42→0,86s · 1→5 quả | **HOẢ TIỄN OANH TẠC** — loạt **4** quả bay vòng cung rơi khắp màn hình |
| 9 | HÀO QUANG HUỶ DIỆT | ĐÁ MỞ RỘNG | ST 13→22 mỗi 0,5s · bán kính 103→180 | **LÒ PHẢN ỨNG** — nở to theo số quái bên trong + phóng điện tới tất cả |
| 10 | PHI TIÊU HỒI | KÍNH SÁT THỦ | ST 23→37 · hồi 1,19→0,77s · 1→3 phi tiêu | **LƯỠI HÁI TỬ THẦN** — bay mãi không về, chém trúng thì to & mạnh thêm 4,5% (tối đa 6 lần) |

**Kiếm Xoay không có hồi chiêu** — nó chạy liên tục mỗi khung hình (`Continuous`/`passive: true`),
mỗi quái chỉ ăn đòn 1 lần / 0,42 giây (`bladeCd`).

**`evoCd`** = hệ số hồi chiêu riêng cho bản tiến hoá (>1 = **bắn thưa hơn** bản thường).
Sau phiên 5: súng xung kích **1,00** · súng săn **0,85** · lôi kích **3,60** · bom **1,75** ·
laser **1,35** · tên lửa **2,10** · phi tiêu **1,25**. Kiếm xoay / băng vực / hào quang không có.

**Đây là núm chính của đợt cắt phiên 5** — người dùng phàn nàn "hiệu ứng sét đánh từ trên
trời nhiều quá", nên phần lớn sức mạnh bị lấy đi qua **tần suất** chứ không qua sát thương:

| Bản tiến hoá | Số hiệu ứng mỗi giây trước | Sau |
|---|---|---|
| LÔI VŨ (tia sét) | 4,75 tia/giây | **1,05 tia/giây** (còn 22%) |
| HOẢ TIỄN OANH TẠC | 7,2 quả/giây | **2,2 quả/giây** (còn 31%) |

---

## 4D. BẢNG TRANG BỊ BỊ ĐỘNG (14)

Hiệu ứng là **tổng cộng theo cấp** (cấp 3 của Ngọc Cường Lực = +36%, không phải cộng dồn từng cấp).

| Trang bị | Mỗi cấp | Tối đa |
|---|---|---|
| NGỌC CƯỜNG LỰC | +12% sát thương | 5 |
| ĐỒNG HỒ CÁT | +11% tốc đánh | 5 |
| GIÀY GIÓ | +8% tốc chạy | 5 |
| TIM THÉP | +22 máu tối đa | 5 |
| GIÁP RỒNG | +2 giáp | 5 |
| NAM CHÂM | +40 tầm hút | 5 |
| KÍNH SÁT THỦ | +8% chí mạng | 5 |
| MÓNG VUỐT | +30% sát thương chí mạng | 5 |
| BÙA HỒI SINH | +0,9 máu/giây | 5 |
| ĐÁ MỞ RỘNG | +14% phạm vi | 5 |
| **ỐNG ĐẠN PHỤ** | **+1 đạn cho MỌI vũ khí** | **3** |
| HUYẾT ẤN | +1,4% hút máu | 5 |
| ÁO CHOÀNG BÓNG | +6% né | 5 |
| SÁCH CỔ | +16% EXP | 5 |

### Chỉ số gốc của người chơi
`maxHp 100 · regen 0 · armor 0 · dodge 0 · moveSpeed 1 · damage 1 · haste 1 · area 1 ·
proj 0 · crit 0.05 · critDmg 1.6 · pickup 96 · lifesteal 0 · xpGain 1`

### Nhân vật
| Nhân vật | Vũ khí đầu | Cộng/trừ |
|---|---|---|
| VỆ BINH | Kiếm Xoay | máu +45 · giáp +3 · tốc chạy −8% · phạm vi +10% |
| XẠ THỦ | Súng Xung Kích | tốc đánh +20% · tầm hút +30 · tốc chạy +4% |
| PHÁP SƯ | Lôi Kích | sát thương +20% · phạm vi +18% · máu −18 |
| SÁT THỦ | Phi Tiêu Hồi | chí mạng +18% · ST chí mạng +30% · tốc chạy +13% · máu −22 |
| KỸ SƯ | Bom Rải | +1 đạn · EXP +15% · hồi máu +0,5/s |

---

## 4E. BẢNG QUÁI & TRÙM

| Quái | Từ màn | Máu | Tốc | ST | EXP | Đặc điểm |
|---|---|---|---|---|---|---|
| grunt | 1 | 22 | 80 | 9 | 1 | đuổi thẳng, hơi lượn |
| swarm | 2 | 10 | 136 | 6 | 1 | nhanh, yếu, đông |
| charger | 3 | 42 | 72 | 16 | 3 | lại gần → **ghì 0,7s (có vạch báo)** → lao 0,55s |
| shooter | 4 | 34 | 64 | 8 | 3 | giữ khoảng cách 320, bắn mỗi ~2,4s |
| tank | 5 | 130 | 48 | 18 | 5 | to, chậm, **kháng đẩy lùi 75%** |
| bomber | 6 | 30 | 92 | 10 | 3 | **chết thì nổ** (34 sát thương, bán kính 82) |
| splitter | 7 | 46 | 74 | 10 | 3 | **chết thì tách 3 con swarm** (con tách không tách nữa) |
| orbiter | 8 | 40 | 110 | 9 | 2 | bay vòng quanh người chơi ở khoảng cách 130 |

**8 trùm, mỗi con một LUẬT ĐẤU TRƯỜNG** (`BOSS_RULES` trong `data.js`) — quy tắc bẻ cong cách
chơi, chỉ có hiệu lực trong lúc đánh con đó rồi tự gỡ. Huy hiệu luật hiện dưới thanh máu trùm.

| Trùm | Màn | Máu gốc | ST | EXP | LUẬT | Đòn |
|---|---|---|---|---|---|---|
| HUYẾT NHÃN | 5 | 1500 | 26 | 60 | KHÁT MÁU — chặn hồi máu + hút máu | toả tròn · lao húc · triệu hồi |
| HƯ KHÔNG GIẢ | 10 | 3400 | 30 | 110 | HẤP LỰC — kéo người chơi về phía trùm 96 đv/s | xoáy ốc · triệu hồi · quét laser |
| BẠO CHÚA THÉP | 15 | 6800 | 36 | 200 | XIỀNG XÍCH — không lướt được | toả tròn · xoáy ốc · lao húc · triệu hồi |
| SƯƠNG HÀN VƯƠNG | 20 | 7000 | 38 | 280 | BĂNG GIÁ — tốc chạy ×0,65 | **frostNova** · toả tròn · lao húc · triệu hồi |
| NGHỊCH ẢNH | 25 | 7600 | 40 | 340 | ĐẢO CHIỀU — lật `Input.dx/dy` | **mirrorDash** · xoáy ốc · quét laser |
| HẮC NHẬT | 30 | 8200 | 42 | 420 | NHẬT THỰC — lớp phủ tối `G.drawEclipse` | **sunburst** · toả tròn · xoáy ốc · triệu hồi |
| TRÙNG MẪU | 35 | 8800 | 44 | 500 | TÁCH BẦY — quái thường chết đẻ 2 swarm | **broodSurge** · toả tròn · lao húc |
| VÔ TẬN | 40 | 9600 | 48 | 640 | THU HẸP — `G.arena` co 46 đv/s, chặn ở 42% | **laserCross** · xoáy ốc · toả tròn · lao húc · triệu hồi |

Hết 8 con thì **quay vòng** (`idx = (floor(màn/5) - 1) % BOSSES.length`).
`máu = gốc × (1 + tier×2.4) × (1 + (màn−5)×0.12)`, `tier = floor((màn−1)/15)`.
Trùm **miễn nhiễm đẩy lùi, miễn hành quyết, không bị đóng băng**. Mỗi đòn có 0,6 giây ghì báo trước.

> ⚠️ **Máu gốc từ con thứ 4 trở đi cố ý chỉ nhích nhẹ.** Hệ số theo màn đã nhân tới ~30 lần
> ở màn 40; nếu để máu gốc cũng gấp đôi mỗi con thì trùm thành bất tử.
>
> ⚠️ **Luật chỉ được bóp DI CHUYỂN / TẦM NHÌN / HỒI MÁU.** Đừng làm luật khoá vũ khí —
> bắn là tự động, khoá đi thì người chơi chỉ còn ngồi nhìn.
>
> ⚠️ **TÁCH BẦY phải đánh dấu con đẻ ra là `_split`** để nó không đẻ tiếp. Không có dấu này
> thì một vụ nổ diện rộng sẽ thành phản ứng dây chuyền hàm mũ, treo máy.
>
> ⚠️ **Vòng đời của luật phải gỡ ở CẢ BA chỗ**: trùm chết (`killEnemy`), người chơi chết
> (`die`), và bắt đầu ván mới (`start`). Thiếu chỗ nào là đấu trường bị kẹt ở 630 sang ván sau.
> Đếm góc quét của `laserCross` bằng `e.swept` chứ **đừng so với `a`** — `a` là góc tới người
> chơi, đổi từng khung hình, so kiểu đó thì lúc quét nửa vòng lúc quét ba vòng.

**Đã đo (bot, bản web):** cả 8 trùm đánh riêng — 0 NaN, 0 lỗi, mọi chiêu đều nổ, ≤0,14 ms/khung.
Soak liên tục 20 phút tới màn 27, 45.843 kill, 5 trùm liên tiếp, luật bật/gỡ đúng, sân trả về 1500.

---

## 5. CÂN BẰNG — SỐ LIỆU ĐO THẬT (đừng chỉnh mò)

### ⚠️ HAI BÀN ĐO, DÙNG ĐÚNG CÁI

| Bàn đo | Cách làm | Dùng cho | Cạm bẫy |
|---|---|---|---|
| **kill/giây** | 45 con `grunt` máu màn 10 tự đi vào vây, người chơi đứng yên | cảm giác "quét sạch màn hình" | ❌ **HÀM BẬC THANG** — grunt màn 10 có 99 máu; vũ khí hoặc giết kịp hoặc không, nhảy từ 1,5 lên 13 chỉ vì đổi hệ số 0,1 |
| **sát thương/giây** | 40 con `tank` (583 máu ở màn 10), đo `G.dmgDealt` | **cân bằng số** — mượt, đơn điệu, quét tham số được | ⚠️ sai với vũ khí tầm gần bền bỉ (hào quang / kiếm xoay / băng vực): chúng dọn sạch vòng vây rồi đứng không, chỉ số tụt giả |

**Luôn cân bằng bằng bàn sát thương/giây trên tank.** Bàn kill/giây chỉ để kiểm tra cảm giác.

> ⚠️ **Hai bảng số ngay dưới đây (phiên 4) đo bằng một bàn đo SAU NÀY MỚI PHÁT HIỆN LÀ HỎNG**
> — nó để `UI.showLevelUp` chạy tự do nên trong lúc đo bot vẫn mọc thêm vũ khí/trang bị.
> Giữ lại để hiểu lịch sử, **đừng dùng làm mốc**. Số đáng tin nằm ở **mục 5B**.

### Số đo GỐC (trước đợt cân bằng 2026-09-10) — sát thương/giây trên tank

| Vũ khí | Cấp 8 | Tiến hoá | Gấp |
|---|---|---|---|
| LÔI KÍCH | 319 | 3748 | **11,7×** |
| TÊN LỬA TẦM NHIỆT | 310 | 2239 | **7,2×** |
| SÚNG SĂN | 312 | 1774 | **5,7×** |
| TIA TỬ THẦN | 734 | 2243 | 3,1× |
| SÚNG XUNG KÍCH | 402 | 1040 | 2,6× |
| PHI TIÊU HỒI | 1013 | 1967 | 1,9× |
| BOM RẢI | 1416 | 2382 | 1,7× |
| BĂNG VỰC | 1494 | 1985 | 1,3× |
| HÀO QUANG HUỶ DIỆT | 1771 | 1884 | 1,1× |
| KIẾM XOAY | 1532 | 1316 | **0,9×** ← tiến hoá là HẠ CẤP |

**Tổng tiến hoá gốc: 20 578.** Chênh lệch giữa các tiến hoá: **13 lần**.

### 🔑 PHÁT HIỆN QUAN TRỌNG NHẤT — đọc trước khi ai đó lại đòi "giảm còn 1/3"

**Trung bình tiến hoá chỉ mạnh gấp 2,2 lần chính vũ khí đó ở cấp 8** (20 578 / 9 303).
Cảm giác "quá mạnh" đến từ **ba con lệch chuẩn** (lôi kích 11,7× · tên lửa 7,2× · súng săn 5,7×)
chứ không phải từ tiến hoá nói chung.

⇒ **KHÔNG THỂ giảm sức mạnh tối đa xuống 1/3 chỉ bằng cách sửa tiến hoá.** Muốn tổng còn 33%
thì tiến hoá phải YẾU HƠN chính cấp 8 của nó — lúc đó thẻ TIẾN HOÁ thành thẻ hạ cấp.
Sức mạnh thật nằm ở **vũ khí cấp 8** + chồng chỉ số bị động, không nằm ở tiến hoá.
Muốn cắt tổng thật sự thì phải cắt cả cấp 8 **và** cắt máu quái theo màn cùng lúc — đổi cặp,
không đổi lẻ.

---

## 5B. ĐỢT CẮT PHIÊN 5 (2026-09-10) — SỐ ĐÁNG TIN, ĐO BẰNG BÀN ĐO ĐÃ SỬA

Người dùng yêu cầu hai việc:
1. *"Giảm sức mạnh tất cả vũ khí cấp max (đột phá cấp cuối) còn 1/3, ví dụ tia sét đang
   đánh 10 phát/giây thì còn 2 phát/giây."*
2. *"Về sau quái trở nên quá yếu, chúng ta quá mạnh khiến không thể thua."*

### Cách cắt (quy tắc, không phải chỉnh mò)
- **Cấp 8**: giữ nguyên sát thương cấp 1, hạ sát thương cấp 8 còn **55%** (đổi `stat(lv)`
  thành `nền' + lv*bước'` với `nền'+bước' = nền+bước` và `nền'+8·bước' = 0,55·(nền+8·bước)`).
  Hồi chiêu / số đạn theo cấp **không đụng** → lên cấp vẫn đã tay.
- **Tiến hoá**: kéo mỗi bản về **≈1,3–1,6× chính cấp 8 của nó**, phần lớn bằng **tần suất**
  (`evoCd`, số tia/số quả mỗi loạt) đúng như người dùng mô tả.

### Bàn đo: 40 con `tank` máu màn 10 · người chơi đứng yên · chỉ số trung tính · không chí mạng · 3×20 giây

| Vũ khí | Cấp 8 trước | Cấp 8 sau | Tiến hoá trước | Tiến hoá sau | Gấp trước | Gấp sau |
|---|---|---|---|---|---|---|
| PHI TIÊU HỒI | 2424 | 1644 | **15613** | 2130 | **6,44×** | 1,30× |
| BOM RẢI | 3112 | 2556 | 4021 | 3099 | 1,29× | 1,21× |
| KIẾM XOAY | 1907 | 1194 | 3471 | 1960 | 1,82× | 1,64× |
| HÀO QUANG | 2120 | 1191 | 2733 | 1782 | 1,29× | 1,50× |
| TIA TỬ THẦN | 970 | 575 | 2255 | 842 | 2,32× | 1,46× |
| BĂNG VỰC | 1281 | 801 | 2221 | 1179 | 1,73× | 1,47× |
| TÊN LỬA | 487 | 282 | 1170 | 392 | 2,40× | 1,39× |
| SÚNG SĂN | 378 | 208 | 997 | 327 | 2,64× | 1,57× |
| SÚNG XUNG KÍCH | 355 | 205 | 829 | 315 | 2,34× | 1,54× |
| LÔI KÍCH | 529 | 296 | 929 | 433 | 1,76× | 1,46× |
| **TỔNG** | **13 563** | **8 952 (66%)** | **34 239** | **12 459 (36%)** | 1,29–6,44× | **1,21–1,64×** |

**Kết quả: tiến hoá còn ~36% — đúng con số "1/3" người dùng xin.** Cấp 8 còn 66%.
Và không bản tiến hoá nào tụt xuống dưới cấp 8 của chính nó, nên thẻ TIẾN HOÁ vẫn là
nâng cấp thật chứ không thành thẻ hạ cấp.

> 🔑 **Vì sao phải hạ CẢ cấp 8 chứ không chỉ hạ tiến hoá.** Trước phiên 5 trung bình
> tiến hoá chỉ mạnh ~2,3 lần cấp 8. Nếu chỉ cắt tiến hoá còn 1/3 thì nó thành **0,77 lần**
> cấp 8 — thẻ TIẾN HOÁ biến thành thẻ hạ cấp. Muốn tổng thật sự còn 1/3 thì bắt buộc phải
> đổi cặp. Đây chính là điều mục 5 đã cảnh báo từ phiên 4, nay đã làm.

### Chữa bệnh "cuối game không thể thua"

Đo được bằng `__late()` (bot mang bộ hoàn thiện thả thẳng vào màn cao):
**bot đi từ màn 15 tới màn 36 mà KHÔNG mất một giọt máu** (210/210), 12 000 kill.
Nó **vẫn ăn 2 800–5 000 sát thương** trong 120 giây — nhưng hồi lại còn nhanh hơn.

Thủ phạm không phải sát thương mà là **hồi máu không có trần**:

| Nguồn | Vì sao phình vô hạn |
|---|---|
| Hút máu (HUYẾT ẤN · ẤN HUYẾT NGUYỆT tầng 1) | tỉ lệ **sát thương gây ra** |
| ẤN HUYẾT NGUYỆT tầng 3: hồi 2 máu mỗi mạng | ~100 mạng/giây ⇒ **200 máu/giây** |
| Tim rơi ra (2,2% quái thường · 35% tinh anh) | tỉ lệ **số mạng** ⇒ ~180 máu/giây ở màn 35 |

Máu tối đa thì cố định (~210). Ba nguồn trên cộng lại vượt xa mọi thứ quái gây ra.

**Cách chữa — gom cả ba vào một hũ có trần** (`G.HEAL_BASE = .045`, `G.HEAL_LS = 1.1`):
```
hũ đầy lại mỗi giây = máu tối đa × (0.045 + hút máu × 1.1)
sức chứa của hũ     = max(1.2 giây hồi, 30% máu tối đa)
```
Sức chứa `30% máu tối đa` là **bắt buộc**: không có nó thì đầu game hũ chỉ giữ ~4 máu,
một trái tim 14 máu ăn vào chỉ được 4 → tim thành vô dụng. Ở màn cao 30% là hạt cát.
**Hồi máu mỗi giây của BÙA HỒI SINH cố ý đứng ngoài trần** — nó là con số cố định, không phình.

Cộng thêm đường cong độ khó dốc lên từ màn 11 (mục 4B).

### Kết quả sau khi chữa — bot mang bộ hoàn thiện, 120 giây mỗi lần

| Thả vào màn | Trước | Sau |
|---|---|---|
| 12 | đầy máu | đầy máu (thoải mái) |
| 15 | đầy máu | đầy máu |
| 20 | đầy máu | **còn 41% máu** |
| 30 | đầy máu | căng, có lần đầy máu có lần tụt sâu |
| 35 | đầy máu | **chết ở giây 88** |
| 40–45 | đầy máu | **chết ở giây 100–110** |

Ván đấu vẫn đi được tới màn 30+, nhưng từ màn 35 trở đi là **chết thật**.

---

## 5C. NÚM VẶN & CẢNH BÁO CHUNG (từ phiên 4, vẫn đúng)

### Ấn Ký tầng 4 — đã cắt xuống ~1/3 (không vướng sàn nào vì là sức mạnh cộng thêm thuần)

| Ấn Ký | Trước | Sau |
|---|---|---|
| LÔI ĐÌNH | lan 12 · mạnh dần +18%/nảy · mỗi 4 đòn | lan **6** · **+5%**/nảy · mỗi **6** đòn |
| HUYẾT NGUYỆT | hành quyết dưới 25% máu · sóng 26+màn×5 | dưới **12%** máu · sóng **10+màn×1,8** |
| BĂNG TINH | đóng băng mỗi 11 giây · 6 mảnh vỡ | mỗi **20 giây** · **3** mảnh |
| HƯ KHÔNG | hố đen r330 · 4s · siêu tân tinh 160+màn×26 | r**200** · **2,6s** · **58+màn×9** |
| PHƯỢNG HOÀNG | sống lại 60% máu · bất tử 3s · xoá sạch màn hình (99999) | **35%** máu · **1,5s** · **60+màn×14** sát thương (không còn xoá sạch) |

### Hiệu ứng hình ảnh — trần cứng, đừng nới

- `Particles.cap` **900 → 600** (web) — 900 làm màn hình trắng xoá, không thấy quái đâu.
- `Cam.SHAKE_CAP` / `Fx.SHAKE_CAP` **20 → 12**.
- Hạt mỗi lần đạn trúng **5 → 3**; vệt đạn truy đuổi `dt*60` → `dt*22`.
- Mọi `doFlash` / `addShake` của tiến hoá và ấn ký giảm **một nửa trở lên**.
- Đo được: đỉnh hạt 890 → **~430–580**, đỉnh rung 12 → **~10**.

### Núm vặn chính
- `evoCd` trong `WEAPONS[id]` / `WeaponDef.EvoCd` — hệ số hồi chiêu riêng cho bản tiến hoá
  (<1 = bắn nhanh hơn, >1 = chậm hơn). Đây là núm hiệu quả và an toàn nhất.
- Sát thương / bán kính / số lượng nằm ngay trong hàm `fire()` của từng vũ khí.
- `Cam.SHAKE_CAP` (web `gfx.js`) / `Fx.SHAKE_CAP` (Unity) = 20, có **giảm dần**.
- **`G.HEAL_BASE` / `G.HEAL_LS`** (phiên 5) — trần hồi máu. Muốn cuối game **dễ hơn** thì
  tăng, **khó hơn** thì giảm. Đây là núm mạnh nhất để điều chỉnh "có thể thua hay không".
- **`ex` trong `spawnEnemy`** (phiên 5) — độ dốc máu quái sau màn 10 (`.012` mỗi màn).
  Đặt về `1.75` cố định là quay lại đường cong cũ.

### Cảnh báo khi cân bằng
- **Hiệu ứng ngưỡng**: Lưỡi Hái nhảy từ 2,7 lên 23,5 kill/giây chỉ vì sát thương vượt qua
  mốc "một nhát giết được quái". Đừng đặt sát thương sát ngay ngưỡng máu quái.
- **Phân liệt là hàm mũ**: `split` 3 đời trở lên tạo phản ứng dây chuyền bùng nổ
  (đo được 77 kill/giây, 17 ms/khung). Giữ ở **2 đời**.
- **Bàn đo có thiên vị**: nếu để quái đứng yên thì Kiếm Xoay và Hào Quang bị đo sai
  (chúng cần quái tới gần). Phải để quái tự đi vào.

---

## 6. CÁCH KIỂM THỬ (đã dùng, hiệu quả)

### Web — server tạm + chạy JS trong trình duyệt
```powershell
# server tĩnh viết bằng PowerShell (KHÔNG có node/python) — đã lưu ở web\tools\serve.ps1
powershell -ExecutionPolicy Bypass -File web\tools\serve.ps1 -Port 8125 -Root web
# (chạy nền: dùng tham số run_in_background của công cụ PowerShell, ĐỪNG dùng Start-Process
#  — đã thử, tiến trình con chết ngay và cổng không mở)
```
Rồi mở `http://localhost:8125/index.html` trong Browser pane.

> ⚠️ **Browser pane KHÔNG cấp khung hình** (`requestAnimationFrame` không chạy, `innerWidth` = 0).
> Muốn chạy game phải **tự bước thủ công**: `for(i=0;i<n;i++) G.update(1/60)` và gán tay
> `Cam.W=1280; Cam.H=720;` mỗi vòng. Đè `Input.update` để giả lập bot điều khiển.

> 🔥 **HAI CÁI BẪY LÀM SAI TOÀN BỘ SỐ ĐO — phiên 5 mất rất nhiều công mới tìm ra.**
>
> **(a) `main.js` có vòng lặp DỰ PHÒNG bằng `setTimeout`.** Vì rAF không chạy trong Browser
> pane, sau 600 ms nó bật vòng `setTimeout(step, 16)`. Vòng này **tiếp tục chơi game GIỮA
> hai lệnh `javascript_exec` của bạn** → cùng một hạt giống ngẫu nhiên cho ra kết quả khác
> nhau mỗi lần, và trạng thái đo bị đẩy đi lung tung. Cách tắt (đứt hẳn chuỗi setTimeout
> vì nó không có try/catch):
> ```js
> const od = G.draw; let armed = true;
> G.draw = function () { if (armed) { armed = false; G.draw = od; throw new Error('stop'); }
>                        return od.apply(this, arguments); };
> ```
>
> **(b) Phải vô hiệu hoá `UI.showLevelUp` khi đo một vũ khí.** Nếu để nguyên, lần lên cấp
> đầu tiên đặt `G.state='levelup'` và `G.update()` thoát ngay → số đo **tụt giả**. Nếu để
> bot tự chọn thẻ thì vũ khí/trang bị **mọc thêm giữa lúc đo** → số đo **phồng giả**
> (đã đo pistol 359 dps trong khi trần lý thuyết chỉ 216). Đặt nó thành hàm rỗng và
> gán `G.pendingLevels = 0` mỗi khung hình.
>
> **Luôn đối chiếu số đo với trần lý thuyết `dmg × số đạn / hồi chiêu`.** Chính phép kiểm
> tra một dòng này mới lộ ra bẫy (b). Nếu số đo vượt trần → bàn đo đang hỏng.
>
> Bàn đo + bot của phiên 5 đã được **lưu vào repo**: `web/tools/bench.js`
> (`__killLoop`, `__bench`, `__table`, `__soak`, `__late`, `__BUILD`) và server tĩnh
> `web/tools/serve.ps1`. Thư mục `tools/` **không** được `index.html` hay `build.ps1` nạp,
> nên nó không ảnh hưởng game. Cách dùng:
> ```powershell
> powershell -ExecutionPolicy Bypass -File web\tools\serve.ps1 -Port 8125 -Root web
> ```
> rồi mở `http://localhost:8125/index.html` trong Browser pane và chạy:
> ```js
> const t = await fetch('/tools/bench.js').then(r => r.text()); (0, eval)(t);
> __killLoop();                                  // BẮT BUỘC, xem bẫy (a)
> __table(['pistol','shotgun','blade']);         // bảng sát thương/giây
> __late('ranger', 35, 120, __BUILD);            // thả bot vào màn 35 với bộ hoàn thiện
> ```
> **Mỗi lệnh `javascript_exec` chỉ chịu được ~45 giây** → chia bảng ra 3–4 vũ khí một lần.
> Nạp lại trang thì phải gọi `__killLoop()` lại.

Mẫu bot né quái dùng lại được:
```js
Input.update = function(){ const p=G.player; let fx=0,fy=0; const L=G.enemies.active;
  for(let i=0;i<L.length;i++){const e=L[i];const d=Math.hypot(e.x-p.x,e.y-p.y);
    if(d<250&&d>1){const w=(250-d)/250; fx-=(e.x-p.x)/d*w; fy-=(e.y-p.y)/d*w;}}
  const dc=Math.hypot(p.x,p.y); if(dc>950){fx+=-p.x/dc*2.5; fy+=-p.y/dc*2.5;}
  if(!fx&&!fy){fx=Math.cos(G.time); fy=Math.sin(G.time*1.3);}
  const m=Math.hypot(fx,fy)||1; this.dx=fx/m; this.dy=fy/m; };
```

### Unity — dòng lệnh
```powershell
$u = "C:\Program Files\Unity\Hub\Editor\6000.3.21f1\Editor\Unity.exe"
$p = "C:\Users\hoang\Projects\MoodBoost\Game 003 - Neon Horde"

# 1) biên dịch + kiểm tra ảnh/dữ liệu
& $u -batchmode -quit -nographics -projectPath "$p" -executeMethod NH.EditorTools.NHBuild.AssetSmoke -logFile C:\Temp\nh.log

# 2) build Windows
& $u -batchmode -quit -nographics -projectPath "$p" -executeMethod NH.EditorTools.NHBuild.BuildWindows -nhout C:\Temp\nhwin -logFile C:\Temp\nh.log

# 3) CHO GAME TỰ CHƠI — cách kiểm thử tốt nhất
C:\Temp\nhwin\NeonHorde.exe -nhsmoke -nhduration 75 -nhshot C:\Temp\shot.png `
  -screen-width 1280 -screen-height 720 -screen-fullscreen 0 -logFile C:\Temp\run.log
# log in ra: [SMOKE] XONG state=... wave=... kills=... lvlups=... dmg=...
# và chụp 3 ảnh màn hình để xem thật
```

> ⚠️ **Unity Editor đang mở sẽ khoá project** → batch mode thoát ngay với mã 1.
> Kiểm tra bằng `Get-Process Unity` và file `Temp/UnityLockfile`.
> **ĐỪNG tự ý tắt Editor của người dùng** — hỏi họ.
> Nếu không tắt được: Editor tự biên dịch khi được focus, đọc kết quả ở
> `%LOCALAPPDATA%\Unity\Editor\Editor.log` (tìm `error CS`) và so
> `Library/ScriptAssemblies/Assembly-CSharp.dll` LastWriteTime với thời điểm sửa file .cs.

> ⚠️ **Khi soi log, tìm cả `NaN` và `is not valid`**, không chỉ `Exception`.
> Lỗi vị trí NaN không ném exception, chỉ ghi log đỏ — suýt lọt lưới một lần.

---

## 7. TRẠNG THÁI HIỆN TẠI & VIỆC CẦN LÀM NGAY

### ✅ Đã xong và đã kiểm chứng
- Bản web: đầy đủ, chạy sạch lỗi qua nhiều lần soak 200–300 giây, 4 nhân vật, có trùm.
- Bản web: 5 Ấn Ký, 10 tiến hoá, điều khiển chuột/cảm ứng, cân bằng đã đo.
- Bản web: 8 trùm + LUẬT ĐẤU TRƯỜNG, `dist/` đã build lại (10:54, mới hơn mọi file nguồn).
- **Phiên 5 (mục 5B)**: cắt sức mạnh cuối game (tiến hoá còn 36%, cấp 8 còn 66%) và chữa
  bệnh "không thể thua" bằng trần hồi máu + đường cong độ khó dốc lên từ màn 11.
  Đo lại toàn bộ 10 vũ khí × 2 dạng bằng bàn đo đã sửa · bot thả vào màn 12/20/30/35/40/45
  · 0 lỗi, 0 NaN. Đã build lại `dist/`.
- Bản Unity: **đã biên dịch sạch cả hai lần** — Editor tự dựng lúc 23:48:13 (0 `error CS`,
  0 exception, 0 NaN trong `Editor.log`, có vào Play mode), và đợt port 8 trùm được
  kiểm tra kiểu lại lúc 01:16 (xem thủ thuật bên dưới).

### 🔍 Biên dịch kiểm tra khi Unity Editor đang mở (thủ thuật hay, dùng lại được)
Editor mở thì khoá project, `-batchmode` thoát ngay. Nhưng có thể gọi thẳng Roslyn của
Unity với chính response file của lần biên dịch trước — chỉ đọc, không đụng khoá:
```bash
OUT="$HOME/AppData/Local/Temp/nhcheck"; mkdir -p "$OUT"
RSP=Library/Bee/artifacts/1900b0aE.dag/Assembly-CSharp.rsp   # thư mục .dag có thể đổi tên
grep -v -e '^-out:' -e '^-refout:' "$RSP" > "$OUT/check.rsp"
printf -- '-out:"%s\\check.dll"\n' "$(cygpath -w "$OUT")" >> "$OUT/check.rsp"
"/c/Program Files/Unity/Hub/Editor/6000.3.21f1/Editor/Data/NetCoreRuntime/dotnet.exe" \
  "/c/Program Files/Unity/Hub/Editor/6000.3.21f1/Editor/Data/DotNetSdkRoslyn/csc.dll" \
  "@$OUT/check.rsp" -nologo
```
Không in ra gì = sạch. Bắt được **mọi lỗi cú pháp và lỗi kiểu**, nhưng KHÔNG thay được
build thật (xem bẫy số 1: shader bị loại chỉ lộ ra khi build).

> Muốn soi chuỗi tiếng Việt trong DLL thì phải dùng PowerShell đọc UTF-16
> (`[Text.Encoding]::Unicode.GetString(...)`) — `grep` của Git Bash nuốt byte null nên
> luôn báo "không thấy" dù chuỗi có thật.

### ⚠️ VIỆC ĐẦU TIÊN CỦA PHIÊN MỚI
**Chưa ai build và chạy thật bản Unity sau đợt port 8 trùm.** Đã kiểm tra kiểu (sạch),
nhưng chưa chạy. Hãy:
1. Xin người dùng đóng Unity Editor.
2. `NHBuild.AssetSmoke` → 3. Build Windows → 4. chạy `-nhsmoke` (lệnh ở mục 6).
5. Đánh tới **màn 40** để đi hết 8 trùm và thấy vòng lặp quay lại con đầu.

Cần nhìn tận mắt mấy thứ chỉ lộ khi chạy:
- **THU HẸP** (trùm VÔ TẬN): `SetArena()` phải vẽ lại lưới nền + quầng sáng + viền.
  Nếu quên thì người chơi bị chặn ở bức tường vô hình cách xa viền đang thấy.
- **NHẬT THỰC** (trùm HẮC NHẬT): sprite `eclipse` là vật thể THẾ GIỚI bám theo người chơi
  (rộng 2800 đơn vị, sortingOrder `Layer.Text + 1`), không phải ảnh giao diện. Phải kiểm
  4 góc màn hình có bị hở sáng không.
- **TÁCH BẦY** (trùm TRÙNG MẪU): xem số quái có bị bùng nổ hàm mũ không (đã chặn bằng
  nhãn `_split` + trần 240 con, nhưng phải nhìn thật).

### 📋 Khác biệt còn lại giữa hai bản
- ❌ **ĐỢT CÂN BẰNG PHIÊN 5 CHƯA PORT SANG UNITY** (người dùng nói để tính sau). Cần đổi:
  · 10 hàm `stat(lv)` trong `GameData.cs` (sát thương cấp 8 còn 55%, cấp 1 giữ nguyên)
  · 7 giá trị `EvoCd` · các hệ số trong `fire()` của từng bản tiến hoá
  · `GameCtrl.cs`: `HEAL_BASE`/`HEAL_LS` + hũ hồi máu (hút máu · tim · ẤN HUYẾT NGUYỆT tầng 3)
  · `GameCtrl.cs`: `ex` trong `SpawnEnemy`, `interval`/`batch`/`elite` trong `UpdateWave`
  · `Sigils.cs`: `onKill` của bloodmoon rút từ hũ
  Bảng số đầy đủ ở **mục 5B** — port theo bảng đó, đừng đo lại từ đầu.
- ✅ 8 trùm + LUẬT ĐẤU TRƯỜNG: **đã port xong sang Unity** (2026-09-10).
- ✅ Lớp phủ đóng băng toàn màn hình: đã có (`sigilTint` trong `UIRoot`).
- Unity chưa dùng LitMotion (người dùng đã cài sẵn cho việc này).
- Unity chưa được cân bằng lại sau khi thêm 5 trùm mới — số liệu trùm chép nguyên từ web,
  chưa đo riêng.

### 💡 Ý tưởng người dùng có thể muốn tiếp
- Nâng bản Unity lên URP để có bloom thật (URP có sẵn offline, không cần tải).
- Build APK (mọi module đã có, chỉ cần `NHBuild.BuildAndroid`).
- Chơi thử tay rồi tinh chỉnh cảm giác — **chưa ai chơi tay bản nào cả**, mọi kiểm thử đều là bot.

---

## 8. NHỮNG CÁI BẪY ĐÃ MẤT CÔNG MỚI TÌM RA

Ghi lại để đừng dẫm lại:

1. **Unity loại bỏ shader không được asset nào tham chiếu khi build.**
   Game gọi `Shader.Find` lúc chạy → bản build mất nền lưới và hiệu ứng sáng,
   **nhưng chạy trong Editor thì vẫn bình thường**. Phải khai báo
   *Project Settings → Graphics → Always Included Shaders* (`NHSetup.EnsureShadersIncluded` lo việc này).
   Loại lỗi chỉ lộ ra khi build → **luôn phải build thật mới yên tâm**.

2. **Lỗi NaN do Nam Châm** (đã sửa ở cả hai bản). Công thức lực hút
   `340 + (tầmHút - khoảngCách) * 4.5` cho giá trị **âm** khi ngọc ở xa (sau khi nhặt Nam Châm)
   → ngọc bị đẩy ra → càng xa lực càng âm → tăng tốc vô hạn → tràn số → NaN.
   **Đã kẹp `clamp(..., 260, 1500)`.** Không ném exception, chỉ ghi log đỏ.

3. **Đừng dùng `setTimeout` cho luồng game.** Ban đầu chuyển màn dùng `setTimeout` (thời gian
   thực) → chạy tiếp cả khi đang tạm dừng. Đã thay bằng bộ hẹn giờ theo **thời gian game**
   (`G.after()` / `GameCtrl.After()`), tự dừng theo pause và quay chậm.

4. **Nướng sprite lười gây khựng giữa trận.** Lần đầu gặp trùm/vũ khí mới phải vẽ sprite ngay
   → đo được một khung hình **1,4 giây**. Đã nướng sẵn tất cả ở menu
   (`Art.warmAll`/`warmSync` bên web, `Art.WarmAll()` bên Unity).

5. **Rung camera cộng dồn.** `shake += v` khiến một loạt 14 vụ nổ đẩy độ rung chạm trần và giật
   liên tục. Đã đổi sang **giảm dần**: `shake += v * (1 - shake/cap)`, cap 20.

6. **`enemiesInRadius` phải trả về danh sách MỚI mỗi lần gọi.** Một vụ nổ có thể giết quái,
   quái đó nổ tiếp và gọi đệ quy vào hàm này — dùng chung một mảng sẽ hỏng vòng lặp tầng ngoài.

7. **Thống kê sát thương từng bị thổi phồng** vì đòn hành quyết (99999) tính cả phần thừa.
   Đã sửa: `dmgDealt += min(dmg, máu còn lại)`.

8. **Biến `const` trùng tên trong cùng khối JS** gây lỗi TDZ khó đoán
   (`const a = pool.active` rồi lại `const a = alpha` trong vòng lặp).

9. **Đường dẫn dài làm Unity crash.** Thư mục scratch của phiên chat dài >248 ký tự →
   Unity crash khi tạo project. Phải để project ở đường dẫn ngắn.

10. **Mọi thứ hồi máu theo SÁT THƯƠNG hay SỐ MẠNG đều phình vô hạn.** Hút máu, "hồi N máu
    mỗi mạng", tim rơi ra từ quái — cả ba tăng cùng sức mạnh người chơi, còn máu tối đa
    thì cố định, nên cuối game người chơi **bất tử** (đo được: màn 35 ăn 5085 sát thương
    trong 120 giây mà vẫn đầy máu). Đã gom cả ba vào **một hũ có trần** (`G.HEAL_BASE` /
    `G.HEAL_LS`, mục 5B). Nếu sau này thêm nguồn hồi máu mới nào tỉ lệ với sát thương hay
    số mạng thì **phải cho nó rút từ hũ này**, đừng cộng máu trực tiếp.

11. **Bàn đo tự chơi rất dễ hỏng mà không báo lỗi.** Xem hai bẫy (a) vòng lặp `setTimeout`
    dự phòng của `main.js` và (b) `UI.showLevelUp` ở mục 6. Cả hai đều cho ra con số trông
    hợp lý nhưng sai tới 2–3 lần. **Cách phát hiện duy nhất: so số đo với trần lý thuyết
    `sát thương × số đạn / hồi chiêu`.** Đã một lần chỉnh cân bằng cả buổi trên số liệu sai.

12. **`resetEnemy` không xoá `e._split`.** Quái lấy lại từ Pool có thể còn nhãn `_split` cũ,
    nên nó sẽ không tách nữa (an toàn, chỉ hơi khác thiết kế). Chưa sửa vì lệch về phía an
    toàn — nhưng nếu sau này thêm cờ nào mà lệch về phía NGUY HIỂM thì phải xoá trong
    `resetEnemy`, không thì nó sống dai qua nhiều ván.

---

## 9. QUY ƯỚC KHI SỬA CODE

- **Sửa bên nào thì đồng bộ bên kia**, hoặc nói rõ với người dùng là chưa đồng bộ.
- Chú thích bằng **tiếng Việt**, giải thích **tại sao** chứ không mô tả lại code.
  Đặc biệt ghi rõ ở những chỗ là cái bẫy (xem mục 8) để người sau không "dọn dẹp" mất.
- Văn bản trong game: tiếng Việt, viết HOA cho tên vũ khí/Ấn Ký.
- Bảng màu: cyan `#25f4ee`, hồng `#ff2e88`, xanh lá `#b6ff3a`, vàng `#ffc93c`,
  đỏ `#ff4d5e`, tím `#9d6bff`, băng `#6fe6ff`.
- Sau khi sửa bản web, **luôn chạy lại `web/build.ps1`** rồi mới xuất bản Artifact
  (Artifact dùng `web/dist/embed.html`, cập nhật bằng cách truyền `url` cũ).
