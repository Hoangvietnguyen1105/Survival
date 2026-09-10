# NEON HORDE — bản Unity

Roguelike survivor (kiểu Brotato / Vampire Survivors / Survivor.io), port từ bản web sang
Unity **6000.3.21f1**. Cùng nội dung, cùng cảm giác chơi.

Điểm đặc biệt: **không có một file ảnh hay file âm thanh nào trong project.**
Toàn bộ sprite được vẽ bằng hình học và mọi tiếng động được tổng hợp bằng sóng âm,
ngay lúc khởi động. Cũng **không có prefab, không phải kéo thả gì** — game tự dựng
camera, thế giới và giao diện khi bấm Play.

---

## 1. Chạy thử

1. Mở **Unity Hub → Add → Add project from disk** → chọn thư mục này.
2. Mở project (lần đầu Unity import khoảng 1–2 phút).
3. Bấm **Play**. Xong.

Scene `Assets/Scenes/Game.unity` đã được tạo sẵn và đưa vào Build Settings.
Nếu vì lý do gì đó thiếu, vào menu **Neon Horde → Thiết lập lại project**.

> Game chạy được ở **bất kỳ scene nào** nhờ `[RuntimeInitializeOnLoadMethod]`
> trong `Bootstrap.cs`, nên không sợ mở nhầm scene.

---

## 2. Điều khiển

| | |
|---|---|
| Di chuyển | `W A S D` / phím mũi tên / tay cầm · chạm & kéo trên điện thoại |
| Tấn công | **Tự động** — vũ khí tự nhắm kẻ địch gần nhất |
| Lướt | `Space` / `Shift` / nút DASH — miễn thương khi lướt |
| Tạm dừng | `ESC` hoặc `P` |
| Tắt/bật tiếng | `M` |

---

## 3. Đóng gói

Menu **Neon Horde** trong Unity:

- **Build Windows** → `Build/Windows/NeonHorde.exe`
- **Build Android (APK)** → `Build/Android/NeonHorde.apk`
- **Build WebGL** → `Build/WebGL/`

Máy này đã cài sẵn cả ba module (Android, WebGL, Windows) nên build được ngay,
không cần tải thêm gì.

Hoặc chạy từ dòng lệnh:

```bash
"C:\Program Files\Unity\Hub\Editor\6000.3.21f1\Editor\Unity.exe" -batchmode -quit -projectPath "C:\Users\hoang\Projects\MoodBoost\Game 003 - Neon Horde" -executeMethod NH.EditorTools.NHBuild.BuildAndroid -logFile -
```

> **APK:** cần cài Android SDK/NDK qua Unity Hub (Add modules) và ký release key
> nếu muốn đưa lên Play Store. Bản debug cài trực tiếp vào máy là chơi được luôn.

---

## 4. Cấu trúc

```
Assets/
├── Scenes/Game.unity          Scene rỗng (game tự dựng mọi thứ)
├── Shaders/NeonAdditive.shader Trộn cộng sáng — thứ tạo ra vẻ neon
├── Editor/
│   ├── NHSetup.cs             Tự cấu hình project lần đầu mở
│   └── NHBuild.cs             Kiểm thử + các lệnh build
└── Scripts/NH/
    ├── Bootstrap.cs           Điểm khởi động
    ├── Util.cs                Toán, object pool, lưới băm không gian, lưu game
    ├── TexCanvas.cs           ★ Bộ vẽ 2D tự viết (thay Canvas của trình duyệt)
    ├── Art.cs                 ★ Định nghĩa toàn bộ ~64 sprite
    ├── Synth.cs               Tổng hợp sóng âm
    ├── Sfx.cs                 Thư viện tiếng động + nhạc nền (sequencer)
    ├── GameData.cs            ★ TOÀN BỘ SỐ LIỆU: nhân vật, vũ khí, trang bị, quái
    ├── Entities.cs            Người chơi, quái, đạn, vật phẩm
    ├── Fx.cs                  Hạt lửa, số sát thương, rung/chớp màn hình, sét, laser
    ├── GameCtrl.cs            Vòng lặp chính, màn chơi, va chạm, sát thương
    ├── UIRoot.cs              Giao diện (dựng bằng code, uGUI)
    ├── InputCtrl.cs           Bàn phím / tay cầm / cần điều khiển ảo
    └── SmokeRunner.cs         Chế độ tự chơi để kiểm thử (xem mục 6)
```

### Muốn chỉnh độ khó / sức mạnh?

Hầu hết nằm trong **`Assets/Scripts/NH/GameData.cs`**:

- Chỉ số quái → phần `BuildEnemies()`
- Sát thương & hồi chiêu vũ khí → hàm `Stat = lv => new WStat { ... }` của từng vũ khí
- Chỉ số nhân vật → danh sách `Characters`
- Quái nào xuất hiện từ màn mấy → bảng `SpawnTable`

Trong **`GameCtrl.cs`**:

- `hpMul` trong `SpawnEnemy()` — quái khoẻ lên nhanh cỡ nào theo màn
- `spawnT` / `batch` trong `UpdateWave()` — quái ra dồn dập cỡ nào
- `WaveDur` trong `EndWave()` — độ dài mỗi màn
- `ApplyCameraSize()` — độ rộng tầm nhìn

---

## 5. Vài lưu ý kỹ thuật

- **Render Pipeline mặc định (Built-in)**, không phải URP. Vẻ phát sáng đến từ
  quầng sáng được "nướng" sẵn vào texture + trộn cộng sáng, giống hệt bản web.
  Muốn có bloom thật thì cài URP rồi đổi `NeonAdditive.shader` sang shader URP.
- **Input Manager cũ** (`UnityEngine.Input`), không dùng `com.unity.inputsystem`.
- Chỉ dùng package đóng gói sẵn trong Editor (`com.unity.ugui` + các module lõi)
  nên **cài offline được**, không cần tải gì.
- ⚠️ Game gọi `Shader.Find` lúc chạy, nên `NeonHorde/Additive` **bắt buộc** phải nằm
  trong *Project Settings → Graphics → Always Included Shaders*. `NHSetup` tự thêm rồi.
  Nếu xoá đi, bản build sẽ mất nền lưới và hiệu ứng sáng (Editor vẫn bình thường —
  đây là loại lỗi chỉ lộ ra khi build).
- Mọi hẹn giờ dùng **thời gian game**, nên tạm dừng và quay chậm không làm lệch nhịp màn chơi.
- Va chạm dùng **lưới băm không gian** tự viết, không dùng Physics2D — chịu được vài trăm quái.

---

## 6. Kiểm thử tự động

**Kiểm tra ảnh + dữ liệu** (không cần vào Play) — menu `Neon Horde → Kiểm tra ảnh + dữ liệu`.
Nó dựng toàn bộ sprite và chạy qua mọi cấp của mọi vũ khí/trang bị.

**Cho game tự chơi:** build bản Windows rồi chạy với tham số `-nhsmoke`:

```bash
NeonHorde.exe -nhsmoke -nhduration 75 -nhshot C:\Temp\shot.png -logFile C:\Temp\run.log
```

Game sẽ tự chọn nhân vật, tự né, tự chọn nâng cấp, chụp 3 ảnh màn hình rồi thoát,
in kết quả vào log dạng:

```
[SMOKE] XONG state=Playing wave=8 kills=777 lvlups=27 ... dmg=56810
```

Kết quả lần chạy gần nhất: **75 giây tự chơi → màn 8, 777 quái bị hạ, 27 lần lên cấp,
6 vũ khí + 6 trang bị, 0 lỗi.**

> Khi soi log, nhớ tìm cả `NaN` và `is not valid` chứ không chỉ `Exception` —
> lỗi vị trí NaN không ném exception, chỉ ghi log đỏ.

---

## 7. Bản web

Bản gốc chạy trên trình duyệt (HTML + Canvas 2D, không thư viện) nằm ở thư mục
`neon-horde` riêng. Hai bản có cùng cân bằng số liệu, chỉnh bên nào thì nhớ
chỉnh bên kia nếu muốn giữ đồng bộ.
