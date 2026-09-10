// ============================================================
//  NEON HORDE — điều khiển: bàn phím, tay cầm, cần điều khiển ảo
//  Dùng Input Manager cũ (có sẵn, không cần cài package).
// ============================================================
using UnityEngine;
using UnityEngine.EventSystems;

namespace NH
{
    public static class InputCtrl
    {
        public static Vector2 Move;              // đã chuẩn hoá, độ dài <= 1
        public static bool TouchMode;            // đã từng chạm màn hình?

        // ---- cần điều khiển ảo ----
        public static bool StickActive;
        public static Vector2 StickCenter;       // toạ độ màn hình
        public static Vector2 StickKnob;
        public const float StickMaxR = 68f;

        /* --- điều khiển bằng chuột: giữ chuột trái, nhân vật chạy tới con trỏ --- */
        public static bool MouseActive;          // đang thực sự lái bằng chuột?
        public static Vector2 CursorWorld;       // vị trí con trỏ trong thế giới game

        static int stickFinger = -1;
        static Vector2 touchDir;
        static bool dashQueued;
        // dùng cho chế độ tự chơi kiểm thử (-nhsmoke)
        public static bool ForceInput;
        public static Vector2 ForcedMove;
        static bool axesOk = true;

        public static void QueueDash() => dashQueued = true;

        public static bool ConsumeDash()
        {
            bool d = dashQueued;
            dashQueued = false;
            return d;
        }

        public static void Reset()
        {
            Move = Vector2.zero;
            touchDir = Vector2.zero;
            stickFinger = -1;
            StickActive = false;
            dashQueued = false;
        }

        public static void Tick()
        {
            // ---------- bàn phím ----------
            float x = 0f, y = 0f;
            if (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow)) x -= 1f;
            if (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow)) x += 1f;
            if (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow)) y -= 1f;
            if (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow)) y += 1f;

            if (Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.LeftShift)) dashQueued = true;
            if (Input.GetMouseButtonDown(1)) dashQueued = true;         // chuột phải = lướt

            // ---------- cảm ứng ----------
            HandleTouch();

            MouseActive = false;

            if (Mathf.Abs(x) > .01f || Mathf.Abs(y) > .01f)
            {
                Move = new Vector2(x, y).normalized;
            }
            else if (touchDir.sqrMagnitude > .01f)
            {
                Move = touchDir;
            }
            else if (!TouchMode && Input.GetMouseButton(0) && MouseDrivable())
            {
                // chạy về phía con trỏ, có vùng chết nhỏ ở giữa để không bị rung
                var G = GameCtrl.I;
                Vector3 w = G.Cam.ScreenToWorldPoint(Input.mousePosition);
                CursorWorld = new Vector2(w.x, w.y);
                Vector2 d = CursorWorld - G.Player.pos;
                float len = d.magnitude;
                if (len > 14f) { Move = d / len; MouseActive = true; }
                else Move = Vector2.zero;
            }
            else
            {
                // ---------- tay cầm ----------
                Vector2 pad = Vector2.zero;
                if (axesOk)
                {
                    try
                    {
                        pad = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
                    }
                    catch { axesOk = false; }
                }
                Move = pad.sqrMagnitude > .05f ? Vector2.ClampMagnitude(pad, 1f) : Vector2.zero;
                if (Input.GetKeyDown(KeyCode.JoystickButton0)) dashQueued = true;
            }

            if (ForceInput) Move = ForcedMove;
        }

        /// <summary>Chỉ lái bằng chuột khi đang chơi và con trỏ không nằm trên nút giao diện.</summary>
        static bool MouseDrivable()
        {
            var G = GameCtrl.I;
            if (G == null || G.Player == null || G.State != GState.Playing || G.Cam == null) return false;
            if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject()) return false;
            return true;
        }

        static void HandleTouch()
        {
            if (Input.touchCount == 0)
            {
                if (stickFinger != -1) EndStick();
                return;
            }
            TouchMode = true;

            for (int i = 0; i < Input.touchCount; i++)
            {
                Touch t = Input.GetTouch(i);

                if (stickFinger == -1 && t.phase == TouchPhase.Began)
                {
                    // đừng cướp cú chạm dành cho nút bấm giao diện
                    if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject(t.fingerId)) continue;
                    stickFinger = t.fingerId;
                    StickCenter = t.position;
                    StickActive = true;
                    UpdateStick(t.position);
                }
                else if (t.fingerId == stickFinger)
                {
                    if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled) EndStick();
                    else UpdateStick(t.position);
                }
            }
        }

        static void UpdateStick(Vector2 p)
        {
            Vector2 d = p - StickCenter;
            float len = d.magnitude;
            StickKnob = len > StickMaxR ? StickCenter + d / len * StickMaxR : p;
            touchDir = len > 8f ? d / len : Vector2.zero;
        }

        static void EndStick()
        {
            stickFinger = -1;
            StickActive = false;
            touchDir = Vector2.zero;
        }
    }
}
