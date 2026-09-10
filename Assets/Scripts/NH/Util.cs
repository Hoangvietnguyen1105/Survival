// ============================================================
//  NEON HORDE — tiện ích chung: toán, object pool, lưới va chạm, lưu game
// ============================================================
using System;
using System.Collections.Generic;
using UnityEngine;

namespace NH
{
    /// <summary>Hàm toán dùng khắp game.</summary>
    public static class M
    {
        public const float TAU = 6.28318530718f;

        public static float Rnd(float a) => UnityEngine.Random.value * a;
        public static float Rnd(float a, float b) => a + UnityEngine.Random.value * (b - a);
        public static int RndI(int a, int b) => UnityEngine.Random.Range(a, b + 1);
        public static bool Chance(float p) => UnityEngine.Random.value < p;
        public static T Pick<T>(IList<T> list) => list[UnityEngine.Random.Range(0, list.Count)];

        public static float Clamp(float v, float a, float b) => v < a ? a : (v > b ? b : v);
        public static float Clamp01(float v) => v < 0f ? 0f : (v > 1f ? 1f : v);

        /// <summary>Nội suy độc lập với tốc độ khung hình. lambda = phần còn lại sau 1 giây.</summary>
        public static float Damp(float a, float b, float lambda, float dt)
            => Mathf.Lerp(a, b, 1f - Mathf.Pow(lambda, dt));

        public static Vector2 Damp(Vector2 a, Vector2 b, float lambda, float dt)
            => Vector2.Lerp(a, b, 1f - Mathf.Pow(lambda, dt));

        public static float Ang(Vector2 from, Vector2 to) => Mathf.Atan2(to.y - from.y, to.x - from.x);
        public static Vector2 Dir(float ang) => new Vector2(Mathf.Cos(ang), Mathf.Sin(ang));

        public static float Dist2(Vector2 a, Vector2 b)
        {
            float dx = b.x - a.x, dy = b.y - a.y;
            return dx * dx + dy * dy;
        }

        /// <summary>Chênh lệch góc rút gọn về [-PI, PI].</summary>
        public static float AngleDiff(float target, float current)
        {
            float d = target - current;
            while (d > Mathf.PI) d -= TAU;
            while (d < -Mathf.PI) d += TAU;
            return d;
        }

        public static void Shuffle<T>(IList<T> a)
        {
            for (int i = a.Count - 1; i > 0; i--)
            {
                int j = UnityEngine.Random.Range(0, i + 1);
                (a[i], a[j]) = (a[j], a[i]);
            }
        }

        public static string FmtTime(float s)
        {
            if (s < 0f) s = 0f;
            int t = Mathf.CeilToInt(s);
            return (t / 60) + ":" + (t % 60).ToString("00");
        }

        public static string FmtNum(float n)
        {
            int v = Mathf.RoundToInt(n);
            if (v >= 1000000) return (v / 1000000f).ToString("0.0") + "M";
            if (v >= 10000) return (v / 1000f).ToString("0.0") + "K";
            return v.ToString();
        }

        public static Color Hex(string hex)
        {
            ColorUtility.TryParseHtmlString(hex.StartsWith("#") ? hex : "#" + hex, out Color c);
            return c;
        }
    }

    /// <summary>
    /// Kho vật thể tái sử dụng. Không cấp phát mới trong lúc chơi để tránh giật do GC.
    /// Vật thể "chết" được thu hồi ở cuối khung hình qua <see cref="Sweep"/>.
    /// </summary>
    public class Pool<T> where T : class, new()
    {
        public readonly List<T> Active = new List<T>(256);
        readonly Stack<T> free = new Stack<T>(256);
        readonly Func<T, bool> isDead;
        readonly Action<T> onRecycle;

        public Pool(Func<T, bool> isDead, Action<T> onRecycle = null)
        {
            this.isDead = isDead;
            this.onRecycle = onRecycle;
        }

        public int Count => Active.Count;

        public T Spawn()
        {
            T o = free.Count > 0 ? free.Pop() : new T();
            Active.Add(o);
            return o;
        }

        /// <summary>Thu hồi mọi phần tử đã chết. Giữ nguyên thứ tự phần còn lại.</summary>
        public void Sweep()
        {
            int n = 0;
            for (int i = 0; i < Active.Count; i++)
            {
                T o = Active[i];
                if (isDead(o)) { onRecycle?.Invoke(o); free.Push(o); }
                else Active[n++] = o;
            }
            if (n < Active.Count) Active.RemoveRange(n, Active.Count - n);
        }

        public void Clear()
        {
            for (int i = 0; i < Active.Count; i++)
            {
                onRecycle?.Invoke(Active[i]);
                free.Push(Active[i]);
            }
            Active.Clear();
        }
    }

    /// <summary>
    /// Lưới băm không gian — chia bản đồ thành ô vuông để chỉ kiểm tra va chạm
    /// với những đối tượng ở ô lân cận thay vì toàn bộ bản đồ.
    /// </summary>
    public class SpatialGrid
    {
        readonly float cell;
        readonly Dictionary<long, List<Enemy>> map = new Dictionary<long, List<Enemy>>(512);
        readonly Stack<List<Enemy>> bucketPool = new Stack<List<Enemy>>(512);

        public SpatialGrid(float cellSize) { cell = cellSize; }

        static long Key(int cx, int cy) => ((long)cx << 32) ^ (uint)cy;

        public void Clear()
        {
            foreach (var kv in map) { kv.Value.Clear(); bucketPool.Push(kv.Value); }
            map.Clear();
        }

        public void Insert(Enemy e)
        {
            int cx = Mathf.FloorToInt(e.pos.x / cell);
            int cy = Mathf.FloorToInt(e.pos.y / cell);
            long k = Key(cx, cy);
            if (!map.TryGetValue(k, out var b))
            {
                b = bucketPool.Count > 0 ? bucketPool.Pop() : new List<Enemy>(8);
                map[k] = b;
            }
            b.Add(e);
        }

        /// <summary>Gom mọi đối tượng trong các ô phủ hình vuông bán kính r quanh (p). Ghi vào <paramref name="into"/>.</summary>
        public void Query(Vector2 p, float r, List<Enemy> into)
        {
            into.Clear();
            int x0 = Mathf.FloorToInt((p.x - r) / cell), x1 = Mathf.FloorToInt((p.x + r) / cell);
            int y0 = Mathf.FloorToInt((p.y - r) / cell), y1 = Mathf.FloorToInt((p.y + r) / cell);
            for (int cx = x0; cx <= x1; cx++)
                for (int cy = y0; cy <= y1; cy++)
                    if (map.TryGetValue(Key(cx, cy), out var b))
                        into.AddRange(b);
        }
    }

    /// <summary>Lưu kỷ lục bằng PlayerPrefs.</summary>
    public static class SaveData
    {
        public static int Best { get => PlayerPrefs.GetInt("nh.best", 0); set { PlayerPrefs.SetInt("nh.best", value); PlayerPrefs.Save(); } }
        public static int BestKills { get => PlayerPrefs.GetInt("nh.bestKills", 0); set { PlayerPrefs.SetInt("nh.bestKills", value); PlayerPrefs.Save(); } }
        public static bool Muted { get => PlayerPrefs.GetInt("nh.muted", 0) == 1; set { PlayerPrefs.SetInt("nh.muted", value ? 1 : 0); PlayerPrefs.Save(); } }
        public static int Runs { get => PlayerPrefs.GetInt("nh.runs", 0); set { PlayerPrefs.SetInt("nh.runs", value); PlayerPrefs.Save(); } }
    }
}
