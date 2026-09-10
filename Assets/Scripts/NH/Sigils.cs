// ============================================================
//  NEON HORDE — ẤN KÝ (buff 4 tầng)
//
//  Mỗi Ấn có 4 tầng, TẦNG 4 BỊ KHOÁ sau một ngưỡng chỉ số. Mỗi Ấn tự cộng
//  một ít đúng loại chỉ số nó cần nhưng KHÔNG BAO GIỜ đủ một mình — người
//  chơi phải chủ động chọn trang bị tương ứng mới mở được tầng cuối.
// ============================================================
using System;
using System.Collections.Generic;
using UnityEngine;

namespace NH
{
    public class SigilInst
    {
        public string id;
        public int lv = 1;
        public int n;          // đếm số đòn đánh (Lôi Đình)
        public float t = 3f;   // đồng hồ riêng
        public bool used;      // Phượng Hoàng đã tái sinh chưa
    }

    public class SigilDef
    {
        public string Id, Name, Tip, AwName;
        public Color Color;
        public int Max = 4;

        public string ReqKey;          // haste | lifesteal | area | pickup | maxHp
        public float ReqMin;
        public string ReqLabel;

        public Action<Stats, int> Apply;
        public Func<int, string> Desc;
        public Action<TexCanvas, float> DrawIcon;

        public Action<GameCtrl, SigilInst, Enemy> OnHit;
        public Action<GameCtrl, SigilInst, Enemy> AfterHit;
        public Action<GameCtrl, SigilInst, Enemy> OnKill;
        public Action<GameCtrl, SigilInst, float> Tick;
        public Func<GameCtrl, SigilInst, Enemy, float> DmgMul;
    }

    public static class Sigils
    {
        public static readonly Dictionary<string, SigilDef> All = new Dictionary<string, SigilDef>();
        public static readonly List<string> Ids = new List<string>();

        static string Hi(object v) => "<color=#b6ff3a><b>" + v + "</b></color>";
        static Vector2 V(float x, float y) => new Vector2(x, y);

        // ---- trạng thái hiệu ứng ----
        public class Hole { public Vector2 p; public float r, life, maxLife, dps, dmgT, spin; public bool big; }
        public static readonly List<Hole> Holes = new List<Hole>(8);
        public static float FreezeT, FlashT;

        public static void Reset()
        {
            Holes.Clear();
            FreezeT = 0f; FlashT = 0f;
        }

        // =========================================================
        static Sigils()
        {
            void S(SigilDef d) { All[d.Id] = d; Ids.Add(d.Id); }

            /* ============ 1. ẤN LÔI ĐÌNH ============ */
            S(new SigilDef
            {
                Id = "thunder", Name = "ẤN LÔI ĐÌNH", Color = M.Hex("#9d6bff"),
                Tip = "Cứ vài đòn đánh lại phóng ra một tia sét.",
                AwName = "BÃO LÔI VÔ TẬN",
                ReqKey = "haste", ReqMin = 1.5f, ReqLabel = "Tốc đánh ≥ 150%",
                Apply = (s, lv) => s.haste += .05f * lv,
                Desc = lv => new[]{
                    $"Cứ {Hi(8)} đòn đánh phóng 1 tia sét",
                    $"Cứ {Hi(6)} đòn · sét lan {Hi(3)} mục tiêu",
                    $"Cứ {Hi(5)} đòn · lan {Hi(4)} · làm {Hi("choáng")}",
                    $"Cứ {Hi(4)} đòn · lan {Hi(12)} mục tiêu · sét chuyển {Hi("trắng–vàng")} và {Hi("MẠNH DẦN +18%")} sau mỗi lần nảy"
                }[lv - 1],
                DrawIcon = (g, r) =>
                {
                    g.StrokePoly(TexCanvas.PolyPoints(4, r * .82f), M.Hex("#9d6bff"), 2.2f);
                    var p = new[]{ V(r*.12f,-r*.58f), V(-r*.32f,r*.04f), V(-r*.02f,r*.04f),
                                   V(-r*.16f,r*.58f), V(r*.34f,-r*.1f), V(r*.03f,-r*.1f) };
                    g.FillPoly(p, M.Hex("#e6d4ff"));
                    g.StrokePoly(p, M.Hex("#c9a8ff"), 1.6f);
                },
                OnHit = (G, st, e) =>
                {
                    int every = new[] { 8, 6, 5, 6 }[st.lv - 1];
                    if (++st.n < every) return;
                    st.n = 0;
                    bool aw = st.lv >= 4;
                    Chain(G, e, new[] { 1, 3, 4, 6 }[st.lv - 1],
                          (24f + G.Wave * 4.5f) * G.Stats.damage,
                          aw ? 1.05f : .88f, st.lv >= 3 ? .35f : 0f, aw);
                    Sfx.Shoot("lightning");
                }
            });

            /* ============ 2. ẤN HUYẾT NGUYỆT ============ */
            S(new SigilDef
            {
                Id = "bloodmoon", Name = "ẤN HUYẾT NGUYỆT", Color = M.Hex("#ff2e88"),
                Tip = "Càng đánh kẻ địch thoi thóp càng đau.",
                AwName = "NGUYỆT THỰC",
                ReqKey = "lifesteal", ReqMin = .05f, ReqLabel = "Hút máu ≥ 5%",
                Apply = (s, lv) => s.lifesteal += .008f * lv,
                Desc = lv => new[]{
                    $"Hút máu {Hi("+0.8%")} mỗi tầng",
                    $"Sát thương {Hi("+35%")} lên kẻ địch dưới {Hi("25%")} máu",
                    $"Mỗi lần hạ gục hồi {Hi(2)} máu",
                    $"{Hi("HÀNH QUYẾT")} tức thì mọi kẻ địch dưới {Hi("25%")} máu — mỗi xác nổ thành {Hi("sóng máu")}"
                }[lv - 1],
                DrawIcon = (g, r) =>
                {
                    // trăng khuyết: đĩa tròn trừ đi một đĩa lệch
                    for (int i = 0; i < 40; i++)
                    {
                        float a0 = i / 40f * M.TAU;
                        Vector2 pt = V(Mathf.Cos(a0) * r * .55f, Mathf.Sin(a0) * r * .55f);
                        if ((pt - V(r * .38f, -r * .18f)).magnitude > r * .62f)
                            g.FillCircle(pt, r * .2f, M.Hex("#ff2e88"));
                    }
                    g.FillCircle(V(-r * .1f, r * .22f), r * .16f, M.Hex("#ffd0e6"));
                },
                DmgMul = (G, st, e) => (st.lv >= 2 && e.hp / e.maxHp < .25f) ? 1.35f : 1f,
                OnKill = (G, st, e) =>
                {
                    if (st.lv < 3) return;
                    var p = G.Player;
                    if (p.hp < p.maxHp) p.hp = Mathf.Min(p.maxHp, p.hp + 2f);
                },
                AfterHit = (G, st, e) =>
                {
                    if (st.lv < 4 || e.dead || e.boss) return;
                    if (e.hp / e.maxHp >= .12f) return;
                    Execute(G, e);
                }
            });

            /* ============ 3. ẤN BĂNG TINH ============ */
            S(new SigilDef
            {
                Id = "frost", Name = "ẤN BĂNG TINH", Color = M.Hex("#6fe6ff"),
                Tip = "Làm chậm, rồi nghiền nát cái gì đã chậm.",
                AwName = "THỜI GIAN NGỪNG TRÔI",
                ReqKey = "area", ReqMin = 1.5f, ReqLabel = "Phạm vi ≥ 150%",
                Apply = (s, lv) => s.area += .06f * lv,
                Desc = lv => new[]{
                    $"{Hi("18%")} đòn đánh làm chậm {Hi("25%")}",
                    $"Kẻ địch đang bị chậm nhận thêm {Hi("25%")} sát thương",
                    $"Kẻ địch chết khi đang chậm sẽ {Hi("nổ băng")}",
                    $"Cứ {Hi("11 giây")} {Hi("ĐÓNG BĂNG TOÀN MÀN HÌNH")} 2 giây — xác đóng băng {Hi("vỡ tan")} thành mảnh xuyên thấu"
                }[lv - 1],
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#6fe6ff");
                    for (int i = 0; i < 3; i++)
                    {
                        float a = i / 3f * Mathf.PI;
                        g.LineRound(V(-Mathf.Cos(a) * r * .78f, -Mathf.Sin(a) * r * .78f),
                                    V(Mathf.Cos(a) * r * .78f, Mathf.Sin(a) * r * .78f), c, 2.4f);
                    }
                    g.FillPoly(TexCanvas.StarPoints(6, r * .34f, r * .14f), M.Hex("#d6f6ff"));
                },
                DmgMul = (G, st, e) => (st.lv >= 2 && e.slowAmt > .02f) ? 1.25f : 1f,
                OnHit = (G, st, e) =>
                {
                    if (M.Chance(.18f))
                    {
                        e.slowAmt = Mathf.Max(e.slowAmt, .25f);
                        e.slowT = Mathf.Max(e.slowT, 1.5f);
                    }
                },
                OnKill = (G, st, e) =>
                {
                    if (st.lv >= 3 && (e.slowAmt > .02f || e.frozen))
                    {
                        float R = 70f * G.Stats.area;
                        Fx.Ring(e.pos, R, M.Hex("#aef3ff"), .35f, 4f);
                        foreach (var o in G.EnemiesInRadius(e.pos, R))
                            G.DamageEnemy(o, (7f + G.Wave * 1.1f) * G.Stats.damage, 0f, 0f, true, true);
                    }
                    if (st.lv >= 4 && e.frozen) Shatter(G, e);
                },
                Tick = (G, st, dt) =>
                {
                    if (st.lv < 4) return;
                    st.t -= dt;
                    if (st.t <= 0f) { st.t = 20f; FreezeAll(G); }
                }
            });

            /* ============ 4. ẤN HƯ KHÔNG ============ */
            S(new SigilDef
            {
                Id = "void", Name = "ẤN HƯ KHÔNG", Color = M.Hex("#c14dff"),
                Tip = "Bẻ cong không gian: hút vật phẩm, rồi hút cả kẻ địch.",
                AwName = "HỐ ĐEN NGUYÊN THUỶ",
                ReqKey = "pickup", ReqMin = 250f, ReqLabel = "Tầm hút ≥ 250",
                Apply = (s, lv) => s.pickup += 30f * lv,
                Desc = lv => new[]{
                    $"Tầm hút vật phẩm {Hi("+30")} mỗi tầng",
                    $"Cứ {Hi("12 giây")} mở một {Hi("lỗ đen")} hút kẻ địch",
                    $"Lỗ đen {Hi("nghiền")} kẻ địch bên trong",
                    $"{Hi("HỐ ĐEN KHỔNG LỒ")} nuốt cả màn hình, khi tan thì {Hi("NỔ SIÊU TÂN TINH")} và hút sạch ngọc"
                }[lv - 1],
                DrawIcon = (g, r) =>
                {
                    g.FillCircle(V(0, 0), r * .8f, new Color(.16f, .04f, .27f, .85f));
                    g.StrokeCircle(V(0, 0), r * .62f, M.Hex("#c14dff"), 2.6f);
                    g.FillCircle(V(0, 0), r * .3f, new Color(0, 0, 0, 1f));
                },
                Tick = (G, st, dt) =>
                {
                    if (st.lv < 2) return;
                    st.t -= dt;
                    if (st.t > 0f) return;
                    bool aw = st.lv >= 4;
                    st.t = aw ? 14f : 12f;
                    var tgt = G.RandomEnemyNear(G.Player.pos, 420f);
                    Vector2 at = tgt != null ? tgt.pos : G.Player.pos;
                    BlackHole(G, at,
                        aw ? 200f : (st.lv >= 3 ? 145f : 115f),
                        aw ? 2.6f : 2.6f,
                        st.lv >= 3 ? (6f + G.Wave * .9f) * G.Stats.damage : 0f,
                        aw);
                }
            });

            /* ============ 5. ẤN PHƯỢNG HOÀNG ============ */
            S(new SigilDef
            {
                Id = "phoenix", Name = "ẤN PHƯỢNG HOÀNG", Color = M.Hex("#ff8a3c"),
                Tip = "Càng gần chết càng mạnh — và chết rồi vẫn đứng dậy.",
                AwName = "TÁI SINH TỪ TRO TÀN",
                ReqKey = "maxHp", ReqMin = 200f, ReqLabel = "Máu tối đa ≥ 200",
                Apply = (s, lv) => s.maxHp += 18f * lv,
                Desc = lv => new[]{
                    $"Máu tối đa {Hi("+18")} mỗi tầng · lướt để lại {Hi("vệt lửa")}",
                    $"Vệt lửa {Hi("thiêu đốt")} kẻ địch đi qua",
                    $"Dưới {Hi("35%")} máu: {Hi("+35%")} tốc chạy, {Hi("+25%")} sát thương",
                    $"{Hi("TÁI SINH")}: lần đầu gục ngã sống lại với {Hi("60%")} máu, thiêu rụi màn hình, bất tử {Hi("3 giây")}"
                }[lv - 1],
                DrawIcon = (g, r) =>
                {
                    var pts = new List<Vector2>();
                    for (int i = 0; i <= 18; i++)
                    {
                        float t = i / 18f;
                        float ang = Mathf.Lerp(-Mathf.PI * .5f, Mathf.PI * 1.5f, t);
                        float rr = r * (.68f - .22f * Mathf.Abs(Mathf.Sin(ang * 2f)));
                        pts.Add(V(Mathf.Cos(ang) * rr, Mathf.Sin(ang) * rr));
                    }
                    g.FillPoly(pts, M.Hex("#ff8a3c"));
                    g.StrokePoly(pts, M.Hex("#ffd9a8"), 1.6f);
                    g.FillCircle(V(0, r * .06f), r * .17f, M.Hex("#fff2c4"));
                },
                Tick = (G, st, dt) =>
                {
                    var p = G.Player;
                    G.Rage = st.lv >= 3 && p.hp / p.maxHp < .35f;
                    if (p.dashT > 0f)
                    {
                        Color[] cols = { M.Hex("#ff8a3c"), M.Hex("#ffc93c"), M.Hex("#ff4d5e") };
                        Fx.Spark(p.pos + new Vector2(M.Rnd(-9f, 9f), M.Rnd(-9f, 9f)),
                                 new Vector2(M.Rnd(-30f, 30f), M.Rnd(10f, 50f)), .5f, 6f, M.Pick(cols));
                        if (st.lv >= 2)
                            G.AddZone(p.pos, 34f * G.Stats.area, 3f,
                                      (6f + G.Wave * .9f) * G.Stats.damage, M.Hex("#ff8a3c"), 0f, false);
                    }
                }
            });
        }

        // =========================================================
        //  Điều kiện tầng cuối
        // =========================================================
        public static float StatOf(Stats s, string key) => key switch
        {
            "haste" => s.haste,
            "lifesteal" => s.lifesteal,
            "area" => s.area,
            "pickup" => s.pickup,
            "maxHp" => s.maxHp,
            _ => 0f
        };

        public static bool ReqMet(GameCtrl G, SigilDef d) => StatOf(G.Stats, d.ReqKey) >= d.ReqMin;

        public static string ReqNow(GameCtrl G, SigilDef d)
        {
            float v = StatOf(G.Stats, d.ReqKey);
            switch (d.ReqKey)
            {
                case "haste":
                case "area": return Mathf.Round(v * 100f) + "%";
                case "lifesteal": return (v * 100f).ToString("0.0") + "%";
                default: return Mathf.Round(v).ToString();
            }
        }

        // =========================================================
        //  Hook
        // =========================================================
        public static float DmgMul(GameCtrl G, Enemy e)
        {
            float m = G.Rage ? 1.25f : 1f;
            foreach (var s in G.SigilList)
            {
                var d = All[s.id];
                if (d.DmgMul != null) m *= d.DmgMul(G, s, e);
            }
            return m;
        }

        public static void OnHit(GameCtrl G, Enemy e)
        {
            foreach (var s in G.SigilList) All[s.id].OnHit?.Invoke(G, s, e);
        }

        public static void AfterHit(GameCtrl G, Enemy e)
        {
            foreach (var s in G.SigilList) All[s.id].AfterHit?.Invoke(G, s, e);
        }

        public static void OnKill(GameCtrl G, Enemy e)
        {
            foreach (var s in G.SigilList) All[s.id].OnKill?.Invoke(G, s, e);
        }

        /// <summary>true nếu Phượng Hoàng đã cứu một mạng.</summary>
        public static bool OnLethal(GameCtrl G)
        {
            SigilInst found = null;
            foreach (var s in G.SigilList)
                if (s.id == "phoenix" && s.lv >= 4 && !s.used) { found = s; break; }
            if (found == null) return false;

            found.used = true;
            var p = G.Player;
            p.hp = p.maxHp * .35f;
            p.iframe = 1.5f;
            G.Rage = false;

            Fx.Shake(12f);
            Fx.Flash(M.Hex("#ffb02e"), .5f);
            G.SlowMo(1.2f);
            UIRoot.I.Announce("TÁI SINH!", M.Hex("#ff8a3c"));
            Sfx.Play("chest", .9f);
            Sfx.Explode(true);
            Fx.Shockwave(p.pos, 380f, M.Hex("#ff8a3c"));

            Color[] cols = { M.Hex("#ff8a3c"), M.Hex("#ffc93c"), M.Hex("#ff4d5e"), M.Hex("#fff2c4") };
            for (int i = 0; i < 35; i++)
            {
                float a = M.Rnd(M.TAU);
                Fx.Spark(p.pos, M.Dir(a) * M.Rnd(200f, 800f), M.Rnd(.6f, 1.3f), M.Rnd(5f, 11f), M.Pick(cols));
            }
            foreach (var en in new List<Enemy>(G.Enemies.Active))
            {
                if (en.dead) continue;
                if (en.boss) { G.DamageEnemy(en, 220f * G.Stats.damage, 0f, 0f, false, true); continue; }
                G.DamageEnemy(en, (60f + G.Wave * 14f) * G.Stats.damage, 0f, 0f, true, true);
            }
            return true;
        }

        public static void Update(GameCtrl G, float dt)
        {
            foreach (var s in G.SigilList) All[s.id].Tick?.Invoke(G, s, dt);

            if (FreezeT > 0f) FreezeT -= dt;
            if (FlashT > 0f) FlashT -= dt;

            for (int i = Holes.Count - 1; i >= 0; i--)
            {
                var h = Holes[i];
                h.life -= dt;
                h.spin += dt * 3.2f;
                if (h.life <= 0f)
                {
                    if (h.big) Supernova(G, h);
                    Holes.RemoveAt(i);
                    continue;
                }
                h.dmgT -= dt;
                var hit = G.EnemiesInRadius(h.p, h.r);
                foreach (var e in hit)
                {
                    if (e.boss) continue;
                    float d = Vector2.Distance(e.pos, h.p);
                    float pull = (h.big ? 520f : 300f) * (1f - d / h.r * .5f);
                    e.pos += M.Dir(M.Ang(e.pos, h.p)) * pull * dt;
                    if (h.dps > 0f && h.dmgT <= 0f)
                        G.DamageEnemy(e, h.dps * .25f, 0f, 0f, true, true);
                }
                if (h.dmgT <= 0f) h.dmgT = .25f;

                if (M.Chance(dt * 40f))
                {
                    float a = M.Rnd(M.TAU);
                    Fx.Spark(h.p + M.Dir(a) * h.r, -M.Dir(a) * h.r * 1.6f, .55f, 5f, M.Hex("#c14dff"));
                }
            }
        }

        // =========================================================
        //  Hiệu ứng
        // =========================================================
        public static void Chain(GameCtrl G, Enemy first, int count, float dmg,
                                 float growth, float stun, bool awakened)
        {
            var seen = new HashSet<int>();
            Enemy cur = first;
            Vector2 prev = G.Player.pos;
            float d = dmg;

            for (int i = 0; i < count && cur != null; i++)
            {
                seen.Add(cur.uid);
                Color col = awakened
                    ? (i < 2 ? M.Hex("#c9a8ff") : i < 5 ? Color.white : M.Hex("#ffe23c"))
                    : M.Hex("#c9a8ff");
                Fx.Arc(prev, cur.pos, col);
                G.DamageEnemy(cur, d, 40f, 0f, false, true);
                if (stun > 0f) cur.stunT = Mathf.Max(cur.stunT, stun);
                Fx.Burst(cur.pos, awakened ? 6 : 4, col, 230f, .3f, 4f);
                d *= growth;
                prev = cur.pos;

                float range = awakened ? 300f : 240f;
                Enemy best = null;
                float bd = range * range;
                foreach (var e in G.EnemiesInRadius(prev, range))
                {
                    if (seen.Contains(e.uid)) continue;
                    float dd = M.Dist2(prev, e.pos);
                    if (dd < bd) { bd = dd; best = e; }
                }
                cur = best;
            }
            if (awakened) { Fx.Shake(2f); Fx.Flash(M.Hex("#ffe23c"), .15f); }
        }

        public static void Execute(GameCtrl G, Enemy e)
        {
            float wave = (10f + G.Wave * 1.8f) * G.Stats.damage;
            Fx.Text(e.pos + new Vector2(0, 20f), "HÀNH QUYẾT", M.Hex("#ff2e88"), 17f);
            Fx.Shockwave(e.pos, 90f, M.Hex("#ff2e88"));
            Fx.Burst(e.pos, 10, M.Hex("#ff2e88"), 280f, .45f, 5f);
            Sfx.Explode(false);
            FlashT = .09f;
            foreach (var o in G.EnemiesInRadius(e.pos, 130f))
            {
                if (o == e) continue;
                G.DamageEnemy(o, wave, 160f, M.Ang(e.pos, o.pos), false, true);
            }
            G.DamageEnemy(e, 99999f, 0f, 0f, true, true);
        }

        public static void FreezeAll(GameCtrl G)
        {
            FreezeT = 2f;
            UIRoot.I.Announce("ĐÓNG BĂNG!", M.Hex("#aef3ff"));
            Sfx.Shoot("frost");
            Fx.Flash(M.Hex("#aef3ff"), .28f);
            Fx.Shake(3f);
            Fx.Shockwave(G.Player.pos, 480f, M.Hex("#aef3ff"));
            foreach (var e in G.Enemies.Active)
            {
                if (e.dead || e.boss) continue;
                e.stunT = Mathf.Max(e.stunT, 2f);
                e.slowAmt = 1f;
                e.slowT = Mathf.Max(e.slowT, 2.2f);
                e.frozen = true;
            }
            G.After(2.2f, () => { foreach (var e in G.Enemies.Active) e.frozen = false; });
        }

        public static void Shatter(GameCtrl G, Enemy e)
        {
            Sfx.Hit(true);
            for (int i = 0; i < 3; i++)
            {
                var s = G.Spec();
                s.pos = e.pos; s.ang = i / 3f * M.TAU + M.Rnd(.3f); s.spd = 520f;
                s.dmg = (8f + G.Wave * 1.2f) * G.Stats.damage;
                s.sprite = "b_frost"; s.color = M.Hex("#aef3ff");
                s.radius = 9f * G.Stats.area; s.life = .8f; s.pierce = 3;
                s.scale = G.Stats.area; s.spin = 12f; s.slow = .3f;
                G.SpawnBullet(s);
            }
            Fx.Burst(e.pos, 8, M.Hex("#aef3ff"), 250f, .35f, 4f);
        }

        public static void BlackHole(GameCtrl G, Vector2 at, float r, float life, float dps, bool big)
        {
            Holes.Add(new Hole { p = at, r = r * G.Stats.area, life = life, maxLife = life, dps = dps, big = big });
            Fx.Ring(at, r * G.Stats.area, M.Hex("#c14dff"), .5f, 5f);
            Sfx.Shoot("frost");
            if (big) { UIRoot.I.Announce("HỐ ĐEN!", M.Hex("#c14dff")); Fx.Shake(4f); }
        }

        static void Supernova(GameCtrl G, Hole h)
        {
            Fx.Shake(10f);
            Fx.Flash(Color.white, .45f);
            Sfx.Explode(true);
            UIRoot.I.Announce("SIÊU TÂN TINH!", Color.white);
            G.Explode(h.p, h.r * 1.2f, (58f + G.Wave * 9f) * G.Stats.damage, M.Hex("#c14dff"), true, 0);

            Color[] cols = { M.Hex("#c14dff"), Color.white, M.Hex("#ff2e88") };
            for (int i = 0; i < 28; i++)
            {
                float a = M.Rnd(M.TAU);
                Fx.Spark(h.p, M.Dir(a) * M.Rnd(300f, 1100f), M.Rnd(.5f, 1.2f), M.Rnd(4f, 10f), M.Pick(cols));
            }
            foreach (var q in G.Pickups.Active) if (q.kind == PickKind.Xp) q.magnetized = true;
        }
    }
}
