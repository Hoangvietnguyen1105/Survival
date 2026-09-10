// ============================================================
//  NEON HORDE — bộ vẽ hình 2D tự viết (thay cho Canvas 2D của trình duyệt)
//
//  Vẽ ở độ phân giải gấp 4 lần rồi thu nhỏ lại => tự động khử răng cưa.
//  Toạ độ tính từ TÂM ảnh, trục y hướng XUỐNG (giống HTML canvas) để có thể
//  bê nguyên công thức vẽ từ bản web sang. Lúc xuất texture thì lật dọc lại
//  cho khớp trục y hướng LÊN của Unity.
// ============================================================
using System.Collections.Generic;
using UnityEngine;

namespace NH
{
    public class TexCanvas
    {
        public const int SS = 4;                 // hệ số siêu lấy mẫu (khử răng cưa)

        public readonly int Size;                // kích thước ảnh cuối (pixel)
        readonly int N;                          // kích thước nội bộ = Size * SS
        readonly float half;
        readonly Color[] buf;

        static readonly List<Vector2> tmpPts = new List<Vector2>(64);

        public TexCanvas(int size)
        {
            Size = size;
            N = size * SS;
            half = N * 0.5f;
            buf = new Color[N * N];              // mặc định trong suốt (0,0,0,0)
        }

        // ---------- toạ độ ----------
        float DX(float x) => x * SS + half;
        float DY(float y) => y * SS + half;

        // ---------- trộn màu (source-over, alpha thường) ----------
        void Blend(int ix, int iy, Color c)
        {
            if (ix < 0 || iy < 0 || ix >= N || iy >= N || c.a <= 0f) return;
            int i = iy * N + ix;
            Color d = buf[i];
            float sa = c.a;
            float outA = sa + d.a * (1f - sa);
            if (outA <= 0.0001f) { buf[i] = new Color(0, 0, 0, 0); return; }
            float inv = 1f / outA;
            buf[i] = new Color(
                (c.r * sa + d.r * d.a * (1f - sa)) * inv,
                (c.g * sa + d.g * d.a * (1f - sa)) * inv,
                (c.b * sa + d.b * d.a * (1f - sa)) * inv,
                outA);
        }

        // ================= hình cơ bản =================

        /// <summary>Tô đa giác đặc (quy tắc chẵn–lẻ).</summary>
        public void FillPoly(IList<Vector2> pts, Color c)
        {
            int n = pts.Count;
            if (n < 3) return;

            float minY = float.MaxValue, maxY = float.MinValue;
            for (int i = 0; i < n; i++)
            {
                float y = DY(pts[i].y);
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
            int y0 = Mathf.Max(0, Mathf.FloorToInt(minY));
            int y1 = Mathf.Min(N - 1, Mathf.CeilToInt(maxY));

            var xs = new List<float>(16);
            for (int py = y0; py <= y1; py++)
            {
                float sy = py + 0.5f;
                xs.Clear();
                for (int i = 0; i < n; i++)
                {
                    Vector2 a = pts[i], b = pts[(i + 1) % n];
                    float ay = DY(a.y), by = DY(b.y);
                    if (ay == by) continue;
                    if ((sy >= ay && sy < by) || (sy >= by && sy < ay))
                    {
                        float t = (sy - ay) / (by - ay);
                        xs.Add(Mathf.Lerp(DX(a.x), DX(b.x), t));
                    }
                }
                if (xs.Count < 2) continue;
                xs.Sort();
                for (int k = 0; k + 1 < xs.Count; k += 2)
                {
                    int px0 = Mathf.Max(0, Mathf.CeilToInt(xs[k] - 0.5f));
                    int px1 = Mathf.Min(N - 1, Mathf.FloorToInt(xs[k + 1] - 0.5f));
                    for (int px = px0; px <= px1; px++) Blend(px, py, c);
                }
            }
        }

        /// <summary>Vẽ viền đa giác. <paramref name="close"/> = nối điểm cuối về điểm đầu.</summary>
        public void StrokePoly(IList<Vector2> pts, Color c, float width, bool close = true)
        {
            int n = pts.Count;
            if (n < 2) return;
            int last = close ? n : n - 1;
            for (int i = 0; i < last; i++) Line(pts[i], pts[(i + 1) % n], c, width);
            // bo tròn chỗ nối
            float r = width * 0.5f;
            int from = close ? 0 : 1;
            int to = close ? n : n - 1;
            for (int i = from; i < to; i++) FillCircle(pts[i], r, c);
        }

        /// <summary>Đoạn thẳng dày (đầu cắt phẳng — dùng StrokePoly nếu cần bo tròn).</summary>
        public void Line(Vector2 a, Vector2 b, Color c, float width)
        {
            Vector2 d = b - a;
            float len = d.magnitude;
            if (len < 0.0001f) { FillCircle(a, width * 0.5f, c); return; }
            Vector2 nrm = new Vector2(-d.y, d.x) / len * (width * 0.5f);
            tmpPts.Clear();
            tmpPts.Add(a + nrm); tmpPts.Add(b + nrm);
            tmpPts.Add(b - nrm); tmpPts.Add(a - nrm);
            FillPoly(tmpPts, c);
        }

        public void LineRound(Vector2 a, Vector2 b, Color c, float width)
        {
            Line(a, b, c, width);
            FillCircle(a, width * 0.5f, c);
            FillCircle(b, width * 0.5f, c);
        }

        public void FillCircle(Vector2 center, float r, Color c)
        {
            float cx = DX(center.x), cy = DY(center.y), rr = r * SS;
            int x0 = Mathf.Max(0, Mathf.FloorToInt(cx - rr)), x1 = Mathf.Min(N - 1, Mathf.CeilToInt(cx + rr));
            int y0 = Mathf.Max(0, Mathf.FloorToInt(cy - rr)), y1 = Mathf.Min(N - 1, Mathf.CeilToInt(cy + rr));
            float r2 = rr * rr;
            for (int y = y0; y <= y1; y++)
                for (int x = x0; x <= x1; x++)
                {
                    float dx = x + 0.5f - cx, dy = y + 0.5f - cy;
                    if (dx * dx + dy * dy <= r2) Blend(x, y, c);
                }
        }

        /// <summary>Vòng tròn rỗng (vành khuyên).</summary>
        public void StrokeCircle(Vector2 center, float r, Color c, float width)
        {
            float cx = DX(center.x), cy = DY(center.y);
            float ro = (r + width * 0.5f) * SS, ri = Mathf.Max(0f, (r - width * 0.5f) * SS);
            int x0 = Mathf.Max(0, Mathf.FloorToInt(cx - ro)), x1 = Mathf.Min(N - 1, Mathf.CeilToInt(cx + ro));
            int y0 = Mathf.Max(0, Mathf.FloorToInt(cy - ro)), y1 = Mathf.Min(N - 1, Mathf.CeilToInt(cy + ro));
            float ro2 = ro * ro, ri2 = ri * ri;
            for (int y = y0; y <= y1; y++)
                for (int x = x0; x <= x1; x++)
                {
                    float dx = x + 0.5f - cx, dy = y + 0.5f - cy;
                    float d2 = dx * dx + dy * dy;
                    if (d2 <= ro2 && d2 >= ri2) Blend(x, y, c);
                }
        }

        /// <summary>Cung tròn rỗng, góc tính bằng radian (chiều kim đồng hồ như canvas).</summary>
        public void StrokeArc(Vector2 center, float r, float a0, float a1, Color c, float width)
        {
            int steps = Mathf.Max(6, Mathf.CeilToInt(Mathf.Abs(a1 - a0) * r * 0.5f));
            Vector2 prev = center + new Vector2(Mathf.Cos(a0) * r, Mathf.Sin(a0) * r);
            for (int i = 1; i <= steps; i++)
            {
                float a = Mathf.Lerp(a0, a1, i / (float)steps);
                Vector2 cur = center + new Vector2(Mathf.Cos(a) * r, Mathf.Sin(a) * r);
                LineRound(prev, cur, c, width);
                prev = cur;
            }
        }

        public void FillRect(float x, float y, float w, float h, Color c)
        {
            tmpPts.Clear();
            tmpPts.Add(new Vector2(x, y)); tmpPts.Add(new Vector2(x + w, y));
            tmpPts.Add(new Vector2(x + w, y + h)); tmpPts.Add(new Vector2(x, y + h));
            FillPoly(tmpPts, c);
        }

        // ================= hình dựng sẵn =================

        public static Vector2[] PolyPoints(int n, float r, float rot = -Mathf.PI / 2f)
        {
            var p = new Vector2[n];
            for (int i = 0; i < n; i++)
            {
                float a = rot + i / (float)n * M.TAU;
                p[i] = new Vector2(Mathf.Cos(a) * r, Mathf.Sin(a) * r);
            }
            return p;
        }

        public static Vector2[] StarPoints(int n, float ro, float ri, float rot = -Mathf.PI / 2f)
        {
            var p = new Vector2[n * 2];
            for (int i = 0; i < n * 2; i++)
            {
                float a = rot + i / (float)(n * 2) * M.TAU;
                float r = (i % 2 == 1) ? ri : ro;
                p[i] = new Vector2(Mathf.Cos(a) * r, Mathf.Sin(a) * r);
            }
            return p;
        }

        /// <summary>Thân neon: tô nền tối + viền sáng.</summary>
        public void Neon(IList<Vector2> pts, Color stroke, float width, Color fill)
        {
            FillPoly(pts, fill);
            StrokePoly(pts, stroke, width);
        }

        // ================= hiệu ứng phát sáng =================

        /// <summary>
        /// Làm mờ kênh alpha hiện tại rồi đặt quầng sáng màu <paramref name="glow"/> xuống DƯỚI hình.
        /// Đây chính là thứ tạo ra vẻ neon — được "nướng" sẵn nên lúc chơi không tốn gì.
        /// </summary>
        public void AddGlow(Color glow, float radius, float strength = 1f)
        {
            int n = N;
            var a = new float[n * n];
            for (int i = 0; i < a.Length; i++) a[i] = buf[i].a;

            int r = Mathf.Max(1, Mathf.RoundToInt(radius * SS / 3f));
            var tmp = new float[n * n];
            for (int pass = 0; pass < 3; pass++) { BoxBlurH(a, tmp, n, r); BoxBlurV(tmp, a, n, r); }

            for (int i = 0; i < a.Length; i++)
            {
                float ga = M.Clamp01(a[i] * strength);
                if (ga <= 0.002f) continue;
                Color d = buf[i];
                // hình gốc nằm ĐÈ lên quầng sáng
                float outA = d.a + ga * (1f - d.a);
                if (outA <= 0.0001f) continue;
                float inv = 1f / outA;
                buf[i] = new Color(
                    (d.r * d.a + glow.r * ga * (1f - d.a)) * inv,
                    (d.g * d.a + glow.g * ga * (1f - d.a)) * inv,
                    (d.b * d.a + glow.b * ga * (1f - d.a)) * inv,
                    outA);
            }
        }

        static void BoxBlurH(float[] src, float[] dst, int n, int r)
        {
            for (int y = 0; y < n; y++)
            {
                int row = y * n;
                float sum = 0f;
                int win = r * 2 + 1;
                for (int i = -r; i <= r; i++) sum += src[row + Mathf.Clamp(i, 0, n - 1)];
                for (int x = 0; x < n; x++)
                {
                    dst[row + x] = sum / win;
                    sum -= src[row + Mathf.Clamp(x - r, 0, n - 1)];
                    sum += src[row + Mathf.Clamp(x + r + 1, 0, n - 1)];
                }
            }
        }

        static void BoxBlurV(float[] src, float[] dst, int n, int r)
        {
            for (int x = 0; x < n; x++)
            {
                float sum = 0f;
                int win = r * 2 + 1;
                for (int i = -r; i <= r; i++) sum += src[Mathf.Clamp(i, 0, n - 1) * n + x];
                for (int y = 0; y < n; y++)
                {
                    dst[y * n + x] = sum / win;
                    sum -= src[Mathf.Clamp(y - r, 0, n - 1) * n + x];
                    sum += src[Mathf.Clamp(y + r + 1, 0, n - 1) * n + x];
                }
            }
        }

        /// <summary>Quầng sáng tròn mềm (dùng cho hạt lửa, ánh sáng).</summary>
        public void RadialGlow(float radius, Color inner, float falloff = 1f)
        {
            float cx = half, cy = half, rr = radius * SS;
            for (int y = 0; y < N; y++)
                for (int x = 0; x < N; x++)
                {
                    float dx = x + 0.5f - cx, dy = y + 0.5f - cy;
                    float d = Mathf.Sqrt(dx * dx + dy * dy) / rr;
                    if (d >= 1f) continue;
                    float v = Mathf.Pow(1f - d, 2.2f * falloff);
                    Blend(x, y, new Color(inner.r, inner.g, inner.b, inner.a * v));
                }
        }

        /// <summary>Ngược với RadialGlow: trong suốt ở tâm, đặc dần ra ngoài, và ĐẶC HẲN
        /// ở ngoài bán kính rOut — kể cả 4 góc, nên phủ kín được cả màn hình.
        /// Dùng cho lớp phủ NHẬT THỰC.</summary>
        public void RadialHole(float rIn, float rOut, Color outer)
        {
            float cx = half, cy = half;
            float ri = rIn * SS, ro = Mathf.Max(ri + 1f, rOut * SS);
            for (int y = 0; y < N; y++)
                for (int x = 0; x < N; x++)
                {
                    float dx = x + 0.5f - cx, dy = y + 0.5f - cy;
                    float d = Mathf.Sqrt(dx * dx + dy * dy);
                    if (d <= ri) continue;
                    float v = d >= ro ? 1f : Mathf.SmoothStep(0f, 1f, (d - ri) / (ro - ri));
                    Blend(x, y, new Color(outer.r, outer.g, outer.b, outer.a * v));
                }
        }

        // ================= xuất ra Unity =================

        /// <summary>Thu nhỏ SS lần và lật dọc (canvas y-xuống -> Unity y-lên).</summary>
        public Texture2D ToTexture(string name = "nh")
        {
            var px = new Color32[Size * Size];
            float inv = 1f / (SS * SS);
            for (int y = 0; y < Size; y++)
            {
                int outY = Size - 1 - y;                 // lật dọc
                for (int x = 0; x < Size; x++)
                {
                    float r = 0, g = 0, b = 0, a = 0;
                    for (int sy = 0; sy < SS; sy++)
                    {
                        int row = (y * SS + sy) * N + x * SS;
                        for (int sx = 0; sx < SS; sx++)
                        {
                            Color c = buf[row + sx];
                            // trộn theo alpha để mép không bị viền đen
                            r += c.r * c.a; g += c.g * c.a; b += c.b * c.a; a += c.a;
                        }
                    }
                    float outA = a * inv;
                    if (a > 0.0001f) { r /= a; g /= a; b /= a; }
                    px[outY * Size + x] = new Color(r, g, b, outA);
                }
            }

            var tex = new Texture2D(Size, Size, TextureFormat.RGBA32, false)
            {
                name = name,
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp,
                anisoLevel = 0
            };
            tex.SetPixels32(px);
            tex.Apply(false, false);
            return tex;
        }

        /// <summary>1 pixel texture = 1 đơn vị thế giới, tâm ở giữa.</summary>
        public Sprite ToSprite(string name = "nh")
        {
            var tex = ToTexture(name);
            var sp = Sprite.Create(tex, new Rect(0, 0, Size, Size), new Vector2(0.5f, 0.5f), 1f, 0,
                                   SpriteMeshType.FullRect);
            sp.name = name;
            return sp;
        }
    }
}
