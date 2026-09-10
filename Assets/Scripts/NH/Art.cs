// ============================================================
//  NEON HORDE — kho hình ảnh sinh bằng code
//  Không có file ảnh nào. Mọi sprite được vẽ bằng hình học một lần lúc khởi
//  động rồi cất vào bộ nhớ đệm; lúc chơi chỉ việc lấy ra dùng.
// ============================================================
using System;
using System.Collections.Generic;
using UnityEngine;

namespace NH
{
    public static class Art
    {
        static readonly Dictionary<string, Sprite> cache = new Dictionary<string, Sprite>(96);
        static readonly Dictionary<string, Sprite> flashCache = new Dictionary<string, Sprite>(32);
        static readonly Dictionary<uint, Sprite> sparkCache = new Dictionary<uint, Sprite>(32);

        // bảng màu
        public static readonly Color Cyan = M.Hex("#25f4ee");
        public static readonly Color Mag = M.Hex("#ff2e88");
        public static readonly Color Lime = M.Hex("#b6ff3a");
        public static readonly Color Gold = M.Hex("#ffc93c");
        public static readonly Color Red = M.Hex("#ff4d5e");
        public static readonly Color Violet = M.Hex("#9d6bff");
        public static readonly Color Ice = M.Hex("#6fe6ff");
        static readonly Color Dark = new Color(8 / 255f, 10 / 255f, 20 / 255f, 0.85f);

        /// <summary>
        /// Nướng TRƯỚC toàn bộ sprite. Nếu để nướng lười giữa trận, lần đầu gặp
        /// trùm hay vũ khí mới sẽ đứng hình cả trăm mili-giây.
        /// </summary>
        public static void WarmAll()
        {
            foreach (var c in GameData.Characters) { Get(c.Sprite); Flash(c.Sprite); }
            foreach (var kv in GameData.Enemies) { Get(kv.Value.Sprite); Flash(kv.Value.Sprite); }
            foreach (var b in GameData.Bosses) { Get(b.Sprite); Flash(b.Sprite); }
            foreach (var id in GameData.WeaponIds) Get("w_" + id);
            foreach (var id in GameData.PassiveIds) Get("i_" + id);
            foreach (var id in Sigils.Ids) Get("s_" + id);
            string[] misc = { "glow","spark","shadow","px","ring","vignette","gridcell","eclipse",
                              "b_basic","b_pellet","b_missile","b_bomb","b_blade","b_frost",
                              "b_enemy","b_shard","b_orb",
                              "p_xp1","p_xp2","p_xp3","p_coin","p_heart","p_magnet","p_nuke","p_chest" };
            foreach (var k in misc) Get(k);
        }

        public static void ClearCache()
        {
            cache.Clear(); flashCache.Clear(); sparkCache.Clear();
        }

        public static Sprite Get(string key)
        {
            if (cache.TryGetValue(key, out var s)) return s;
            s = Build(key);
            cache[key] = s;
            return s;
        }

        /// <summary>Bản bóng trắng toàn phần — dùng khi quái trúng đòn.</summary>
        public static Sprite Flash(string key)
        {
            if (flashCache.TryGetValue(key, out var s)) return s;
            Sprite src = Get(key);
            Texture2D st = src.texture;
            var tex = new Texture2D(st.width, st.height, TextureFormat.RGBA32, false)
            { filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp };
            var px = st.GetPixels32();
            for (int i = 0; i < px.Length; i++) px[i] = new Color32(255, 255, 255, px[i].a);
            tex.SetPixels32(px); tex.Apply(false, false);
            s = Sprite.Create(tex, new Rect(0, 0, st.width, st.height), new Vector2(.5f, .5f), 1f, 0, SpriteMeshType.FullRect);
            flashCache[key] = s;
            return s;
        }

        /// <summary>Quầng sáng tròn tô sẵn màu (dùng cho hạt lửa).</summary>
        public static Sprite Spark(Color c)
        {
            uint k = (uint)((byte)(c.r * 255) << 16 | (byte)(c.g * 255) << 8 | (byte)(c.b * 255));
            if (sparkCache.TryGetValue(k, out var s)) return s;
            var cv = new TexCanvas(32);
            cv.RadialGlow(15f, new Color(c.r, c.g, c.b, 1f), 1f);
            s = cv.ToSprite("spark");
            sparkCache[k] = s;
            return s;
        }

        static Sprite Bake(int size, Action<TexCanvas, float> draw, float glow, Color glowColor, string name)
        {
            var c = new TexCanvas(size);
            draw(c, size * 0.5f);
            if (glow > 0f) c.AddGlow(glowColor, glow, 1f);
            return c.ToSprite(name);
        }

        static Vector2 V(float x, float y) => new Vector2(x, y);

        /* Dời một hình đi chỗ khác. TexCanvas không có ngăn xếp biến đổi như
           Canvas trình duyệt (không có translate/save/restore), nên muốn vẽ
           hình lệch tâm thì phải dời sẵn từng điểm. */
        static Vector2[] Off(Vector2[] pts, float dx, float dy)
        {
            var o = new Vector2[pts.Length];
            for (int i = 0; i < pts.Length; i++) o[i] = new Vector2(pts[i].x + dx, pts[i].y + dy);
            return o;
        }

        // ============================================================
        //  Định nghĩa từng sprite
        // ============================================================
        static Sprite Build(string key)
        {
            switch (key)
            {
                // ---------------- NHÂN VẬT ----------------
                case "ch_guard":
                    return Bake(72, (g, r) =>
                    {
                        float R = r * .62f;
                        var p = TexCanvas.PolyPoints(6, R, 0f);
                        g.Neon(p, M.Hex("#ff8a3c"), 4, new Color(40 / 255f, 16 / 255f, 6 / 255f, .9f));
                        g.FillPoly(TexCanvas.PolyPoints(6, R * .55f, 0f), new Color(1f, .54f, .23f, .35f));
                        g.LineRound(V(0, -R * .5f), V(0, R * .5f), M.Hex("#ffd9a8"), 2);
                        g.LineRound(V(-R * .38f, 0), V(R * .38f, 0), M.Hex("#ffd9a8"), 2);
                    }, 16, M.Hex("#ff8a3c"), key);

                case "ch_ranger":
                    return Bake(72, (g, r) =>
                    {
                        float R = r * .64f;
                        var p = new[] { V(0, -R), V(R * .8f, R * .62f), V(0, R * .3f), V(-R * .8f, R * .62f) };
                        g.Neon(p, Cyan, 4, new Color(4 / 255f, 28 / 255f, 32 / 255f, .9f));
                        g.FillCircle(V(0, -R * .18f), R * .2f, new Color(Cyan.r, Cyan.g, Cyan.b, .5f));
                    }, 16, Cyan, key);

                case "ch_mage":
                    return Bake(72, (g, r) =>
                    {
                        float R = r * .6f;
                        g.Neon(TexCanvas.PolyPoints(4, R), Violet, 4, new Color(20 / 255f, 10 / 255f, 40 / 255f, .9f));
                        g.FillCircle(V(0, 0), R * .28f, M.Hex("#d9c4ff"));
                        var arc = new Color(Violet.r, Violet.g, Violet.b, .7f);
                        g.StrokeArc(V(0, 0), R * .46f, .4f, 2.4f, arc, 2);
                        g.StrokeArc(V(0, 0), R * .46f, .4f + Mathf.PI, 2.4f + Mathf.PI, arc, 2);
                    }, 18, Violet, key);

                case "ch_assassin":
                    return Bake(72, (g, r) =>
                    {
                        float R = r * .62f;
                        g.Neon(TexCanvas.StarPoints(4, R, R * .3f), Mag, 3.5f, new Color(36 / 255f, 4 / 255f, 20 / 255f, .9f));
                        g.FillCircle(V(0, 0), R * .2f, new Color(Mag.r, Mag.g, Mag.b, .55f));
                    }, 16, Mag, key);

                case "ch_engineer":
                    return Bake(72, (g, r) =>
                    {
                        float R = r * .58f;
                        g.Neon(TexCanvas.PolyPoints(8, R, Mathf.PI / 8f), Lime, 4, new Color(18 / 255f, 30 / 255f, 4 / 255f, .9f));
                        g.StrokeCircle(V(0, 0), R * .42f, M.Hex("#e6ffb0"), 2.5f);
                        for (int i = 0; i < 4; i++)
                        {
                            float a = i / 4f * M.TAU + .4f;
                            g.FillCircle(V(Mathf.Cos(a) * R * .42f, Mathf.Sin(a) * R * .42f), 2.6f, Lime);
                        }
                    }, 16, Lime, key);

                // ---------------- QUÁI ----------------
                case "e_grunt":
                    return Bake(48, (g, r) =>
                    {
                        g.Neon(TexCanvas.PolyPoints(3, r * .62f), Red, 3, new Color(34 / 255f, 6 / 255f, 10 / 255f, .9f));
                        g.FillCircle(V(0, r * .08f), 3, M.Hex("#ffb3bb"));
                    }, 12, Red, key);

                case "e_swarm":
                    return Bake(34, (g, r) =>
                        g.Neon(TexCanvas.PolyPoints(4, r * .55f), M.Hex("#ffa62e"), 2.4f, new Color(38 / 255f, 20 / 255f, 2 / 255f, .9f)),
                        9, M.Hex("#ffa62e"), key);

                case "e_tank":
                    return Bake(76, (g, r) =>
                    {
                        g.Neon(TexCanvas.PolyPoints(6, r * .66f, 0f), M.Hex("#8f5bff"), 5, new Color(18 / 255f, 8 / 255f, 40 / 255f, .92f));
                        g.StrokePoly(TexCanvas.PolyPoints(6, r * .42f, 0f), new Color(200 / 255f, 170 / 255f, 1f, .6f), 2.5f);
                        g.FillCircle(V(0, 0), r * .14f, M.Hex("#e0d2ff"));
                    }, 16, M.Hex("#8f5bff"), key);

                case "e_shooter":
                    return Bake(50, (g, r) =>
                    {
                        g.Neon(TexCanvas.PolyPoints(4, r * .58f, 0f), M.Hex("#3ce0ff"), 3, new Color(4 / 255f, 26 / 255f, 34 / 255f, .9f));
                        g.FillRect(-r * .06f, -r * .34f, r * .12f, r * .68f, M.Hex("#bff2ff"));
                    }, 13, M.Hex("#3ce0ff"), key);

                case "e_splitter":
                    return Bake(54, (g, r) =>
                    {
                        var col = M.Hex("#3affa0");
                        g.FillCircle(V(0, 0), r * .55f, new Color(4 / 255f, 32 / 255f, 20 / 255f, .9f));
                        g.StrokeCircle(V(0, 0), r * .55f, col, 3);
                        g.LineRound(V(-r * .34f, 0), V(r * .34f, 0), M.Hex("#bfffe0"), 2);
                        g.LineRound(V(0, -r * .34f), V(0, r * .34f), M.Hex("#bfffe0"), 2);
                    }, 13, M.Hex("#3affa0"), key);

                case "e_charger":
                    return Bake(56, (g, r) =>
                    {
                        var p = new[] { V(r * .62f, 0), V(-r * .38f, -r * .5f), V(-r * .16f, 0), V(-r * .38f, r * .5f) };
                        g.Neon(p, M.Hex("#ffe23c"), 3, new Color(36 / 255f, 30 / 255f, 2 / 255f, .9f));
                    }, 14, M.Hex("#ffe23c"), key);

                case "e_bomber":
                    return Bake(56, (g, r) =>
                    {
                        g.Neon(TexCanvas.StarPoints(8, r * .58f, r * .38f), M.Hex("#ff5ecf"), 3, new Color(34 / 255f, 6 / 255f, 26 / 255f, .9f));
                        g.FillCircle(V(0, 0), r * .18f, M.Hex("#ffd0f2"));
                    }, 15, M.Hex("#ff5ecf"), key);

                case "e_orbiter":
                    return Bake(46, (g, r) =>
                        g.Neon(TexCanvas.PolyPoints(5, r * .55f), M.Hex("#7cff2e"), 3, new Color(16 / 255f, 34 / 255f, 4 / 255f, .9f)),
                        12, M.Hex("#7cff2e"), key);

                case "e_boss":
                    return Bake(128, (g, r) =>
                    {
                        g.Neon(TexCanvas.StarPoints(6, r * .68f, r * .38f), M.Hex("#ff2e4d"), 7, new Color(30 / 255f, 2 / 255f, 8 / 255f, .95f));
                        g.Neon(TexCanvas.PolyPoints(6, r * .34f, 0f), M.Hex("#ff9ba8"), 4, new Color(60 / 255f, 4 / 255f, 14 / 255f, .9f));
                        g.FillCircle(V(0, 0), r * .12f, Color.white);
                    }, 26, M.Hex("#ff2e4d"), key);

                case "e_boss2":
                    return Bake(128, (g, r) =>
                    {
                        g.Neon(TexCanvas.PolyPoints(8, r * .64f, Mathf.PI / 8f), M.Hex("#c14dff"), 7, new Color(22 / 255f, 4 / 255f, 40 / 255f, .95f));
                        g.StrokeCircle(V(0, 0), r * .4f, M.Hex("#ecd0ff"), 4);
                        g.StrokeCircle(V(0, 0), r * .22f, M.Hex("#ecd0ff"), 4);
                    }, 26, M.Hex("#c14dff"), key);

                case "e_boss3":
                    return Bake(128, (g, r) =>
                    {
                        g.Neon(TexCanvas.StarPoints(5, r * .7f, r * .3f), M.Hex("#ffb02e"), 7, new Color(40 / 255f, 22 / 255f, 2 / 255f, .95f));
                        g.Neon(TexCanvas.PolyPoints(3, r * .3f), M.Hex("#fff0c4"), 4, new Color(60 / 255f, 34 / 255f, 4 / 255f, .9f));
                    }, 26, M.Hex("#ffb02e"), key);

                /* SƯƠNG HÀN VƯƠNG — bông tuyết 6 nhánh */
                case "e_boss4":
                    return Bake(128, (g, r) =>
                    {
                        g.Neon(TexCanvas.StarPoints(6, r * .82f, r * .17f), Ice, 6, new Color(4 / 255f, 26 / 255f, 40 / 255f, .95f));
                        for (int i = 0; i < 6; i++)   // gai băng phụ giữa các nhánh
                        {
                            float a = i / 6f * M.TAU + Mathf.PI / 6f;
                            g.Line(V(Mathf.Cos(a) * r * .18f, Mathf.Sin(a) * r * .18f),
                                   V(Mathf.Cos(a) * r * .5f, Mathf.Sin(a) * r * .5f), M.Hex("#d6f8ff"), 3);
                        }
                        g.Neon(TexCanvas.PolyPoints(6, r * .24f, 0f), M.Hex("#eafcff"), 3, new Color(10 / 255f, 40 / 255f, 60 / 255f, .9f));
                    }, 26, Ice, key);

                /* NGHỊCH ẢNH — hai bản sao lệch nhau qua một trục gương.
                   ⚠ Đừng vẽ thành sao 6 cánh: trùng hệt HUYẾT NHÃN, giữa trận
                   người chơi không phân biệt nổi hai con. */
                case "e_boss5":
                    return Bake(128, (g, r) =>
                    {
                        g.Neon(Off(TexCanvas.PolyPoints(4, r * .7f), -r * .13f, 0f), M.Hex("#1fd98a"), 5, new Color(2 / 255f, 26 / 255f, 16 / 255f, .7f));
                        g.Neon(Off(TexCanvas.PolyPoints(4, r * .7f), r * .13f, 0f), M.Hex("#9dffd6"), 5, new Color(2 / 255f, 26 / 255f, 16 / 255f, .5f));
                        g.Line(V(0, -r * .82f), V(0, r * .82f), M.Hex("#eafff6"), 3);      // trục gương
                        g.Neon(TexCanvas.PolyPoints(4, r * .21f, Mathf.PI / 4f), M.Hex("#3affa0"), 3, M.Hex("#04150e"));
                    }, 26, M.Hex("#3affa0"), key);

                /* HẮC NHẬT — vành nhật hoa, lõi tối đen */
                case "e_boss6":
                    return Bake(128, (g, r) =>
                    {
                        g.Neon(TexCanvas.StarPoints(16, r * .8f, r * .56f), M.Hex("#ff6a2e"), 5, new Color(38 / 255f, 10 / 255f, 2 / 255f, .95f));
                        g.FillCircle(V(0, 0), r * .48f, new Color(52 / 255f, 16 / 255f, 4 / 255f, .95f));
                        g.StrokeCircle(V(0, 0), r * .48f, M.Hex("#ffb27a"), 4);
                        g.FillCircle(V(0, 0), r * .3f, M.Hex("#05060c"));       // lõi đen: đây là NHẬT THỰC
                        g.StrokeCircle(V(0, 0), r * .3f, M.Hex("#ffd9b0"), 2.4f);
                    }, 26, M.Hex("#ff6a2e"), key);

                /* TRÙNG MẪU — tổ ong ba ổ trứng */
                case "e_boss7":
                    return Bake(128, (g, r) =>
                    {
                        g.Neon(TexCanvas.PolyPoints(6, r * .78f, 0f), Mag, 6, new Color(40 / 255f, 2 / 255f, 20 / 255f, .95f));
                        for (int i = 0; i < 3; i++)
                        {
                            float a = i / 3f * M.TAU - Mathf.PI / 2f;
                            g.Neon(Off(TexCanvas.PolyPoints(6, r * .2f, 0f), Mathf.Cos(a) * r * .36f, Mathf.Sin(a) * r * .36f),
                                   M.Hex("#ffb3d6"), 2.6f, new Color(72 / 255f, 4 / 255f, 36 / 255f, .9f));
                        }
                    }, 26, Mag, key);

                /* VÔ TẬN — 12 cạnh + ba vòng đồng tâm, trắng lạnh */
                case "e_boss8":
                    return Bake(128, (g, r) =>
                    {
                        g.Neon(TexCanvas.PolyPoints(12, r * .8f, 0f), M.Hex("#eafcff"), 5, new Color(10 / 255f, 18 / 255f, 34 / 255f, .95f));
                        for (int i = 3; i >= 1; i--) g.StrokeCircle(V(0, 0), r * .17f * i, M.Hex("#8ff6ff"), 3);
                        g.Neon(TexCanvas.StarPoints(4, r * .62f, r * .1f), Color.white, 3, new Color(190 / 255f, 240 / 255f, 1f, .22f));
                    }, 26, M.Hex("#eafcff"), key);

                // ---------------- ĐẠN ----------------
                case "b_basic":
                    return Bake(20, (g, r) =>
                    {
                        for (int i = 0; i < 20; i++)   // ellipse xấp xỉ
                        {
                            float t = i / 20f * M.TAU;
                            g.FillCircle(V(Mathf.Cos(t) * r * .3f, Mathf.Sin(t) * r * .06f), r * .2f, M.Hex("#eafcff"));
                        }
                        g.FillCircle(V(-r * .18f, 0), r * .18f, new Color(Cyan.r, Cyan.g, Cyan.b, .75f));
                    }, 10, Cyan, key);

                case "b_pellet":
                    return Bake(14, (g, r) => g.FillCircle(V(0, 0), r * .38f, M.Hex("#fff2c4")), 8, Gold, key);

                case "b_missile":
                    return Bake(24, (g, r) =>
                    {
                        var p = new[] { V(r * .6f, 0), V(-r * .4f, -r * .3f), V(-r * .2f, 0), V(-r * .4f, r * .3f) };
                        g.FillPoly(p, M.Hex("#ffd2e6"));
                        g.StrokePoly(p, Mag, 1.6f);
                    }, 12, Mag, key);

                case "b_bomb":
                    return Bake(26, (g, r) =>
                    {
                        g.FillCircle(V(0, 0), r * .48f, M.Hex("#2b3350"));
                        g.StrokeCircle(V(0, 0), r * .48f, M.Hex("#ffb02e"), 2.5f);
                        g.FillCircle(V(0, -r * .2f), r * .12f, M.Hex("#ffe6b0"));
                    }, 12, M.Hex("#ffb02e"), key);

                case "b_blade":
                    return Bake(46, (g, r) =>
                    {
                        // lưỡi liềm: cung ngoài trừ cung trong
                        var pts = new List<Vector2>();
                        for (int i = 0; i <= 16; i++)
                        {
                            float a = Mathf.Lerp(-.9f, .9f, i / 16f);
                            pts.Add(V(Mathf.Cos(a) * r * .62f, Mathf.Sin(a) * r * .62f));
                        }
                        for (int i = 16; i >= 0; i--)
                        {
                            float a = Mathf.Lerp(-.9f, .9f, i / 16f);
                            pts.Add(V(r * .28f + Mathf.Cos(a) * r * .42f, Mathf.Sin(a) * r * .42f));
                        }
                        g.FillPoly(pts, new Color(230 / 255f, 1f, 1f, .92f));
                        g.StrokePoly(pts, Cyan, 2);
                    }, 16, Cyan, key);

                case "b_frost":
                    return Bake(22, (g, r) =>
                    {
                        var p = TexCanvas.StarPoints(6, r * .5f, r * .2f);
                        g.FillPoly(p, M.Hex("#d6f6ff"));
                        g.StrokePoly(p, Ice, 1.4f);
                    }, 11, Ice, key);

                case "b_enemy":
                    return Bake(20, (g, r) =>
                    {
                        g.FillCircle(V(0, 0), r * .42f, M.Hex("#ffd6f0"));
                        g.StrokeCircle(V(0, 0), r * .42f, M.Hex("#ff3ca0"), 2);
                    }, 11, M.Hex("#ff3ca0"), key);

                case "b_shard":
                    return Bake(20, (g, r) =>
                    {
                        var p = new[] { V(r * .55f, 0), V(0, -r * .22f), V(-r * .35f, 0), V(0, r * .22f) };
                        g.FillPoly(p, M.Hex("#e6ffb0"));
                        g.StrokePoly(p, Lime, 1.4f);
                    }, 10, Lime, key);

                case "b_orb":
                    return Bake(30, (g, r) =>
                    {
                        g.FillCircle(V(0, 0), r * .44f, new Color(200 / 255f, 150 / 255f, 1f, .9f));
                        g.StrokeCircle(V(0, 0), r * .44f, M.Hex("#c14dff"), 2.4f);
                    }, 14, M.Hex("#c14dff"), key);

                // ---------------- VẬT PHẨM ----------------
                case "p_xp1":
                    return Bake(20, (g, r) => g.Neon(TexCanvas.PolyPoints(4, r * .45f), Cyan, 2, new Color(20 / 255f, 220 / 255f, 220 / 255f, .85f)), 10, Cyan, key);
                case "p_xp2":
                    return Bake(24, (g, r) => g.Neon(TexCanvas.PolyPoints(4, r * .5f), Lime, 2.2f, new Color(150 / 255f, 240 / 255f, 60 / 255f, .9f)), 12, Lime, key);
                case "p_xp3":
                    return Bake(30, (g, r) => g.Neon(TexCanvas.StarPoints(5, r * .55f, r * .26f), Gold, 2.4f, new Color(1f, 190 / 255f, 60 / 255f, .9f)), 15, Gold, key);

                case "p_coin":
                    return Bake(22, (g, r) =>
                    {
                        g.FillCircle(V(0, 0), r * .42f, M.Hex("#ffd96b"));
                        g.StrokeCircle(V(0, 0), r * .42f, M.Hex("#a86e00"), 1.6f);
                        g.FillRect(-r * .05f, -r * .22f, r * .1f, r * .44f, M.Hex("#a86e00"));
                    }, 11, Gold, key);

                case "p_heart":
                    return Bake(26, (g, r) =>
                    {
                        var p = HeartPoints(r * .5f);
                        g.FillPoly(p, M.Hex("#ff4d6b"));
                        g.StrokePoly(p, M.Hex("#ffd0d8"), 1.4f);
                    }, 13, M.Hex("#ff4d6b"), key);

                case "p_magnet":
                    return Bake(28, (g, r) =>
                    {
                        g.StrokeArc(V(0, r * .1f), r * .38f, Mathf.PI, M.TAU, M.Hex("#4de1ff"), r * .22f);
                        g.Line(V(-r * .38f, r * .1f), V(-r * .38f, r * .34f), Red, r * .22f);
                        g.Line(V(r * .38f, r * .1f), V(r * .38f, r * .34f), Red, r * .22f);
                    }, 13, M.Hex("#4de1ff"), key);

                case "p_nuke":
                    return Bake(30, (g, r) =>
                    {
                        g.FillCircle(V(0, 0), r * .48f, M.Hex("#1a1030"));
                        g.StrokeCircle(V(0, 0), r * .48f, M.Hex("#ffe23c"), 2);
                        for (int i = 0; i < 3; i++)
                        {
                            float a0 = i / 3f * M.TAU - .38f, a1 = i / 3f * M.TAU + .38f;
                            var wedge = new List<Vector2> { V(0, 0) };
                            for (int k = 0; k <= 8; k++)
                            {
                                float a = Mathf.Lerp(a0, a1, k / 8f);
                                wedge.Add(V(Mathf.Cos(a) * r * .38f, Mathf.Sin(a) * r * .38f));
                            }
                            g.FillPoly(wedge, M.Hex("#ffe23c"));
                        }
                    }, 15, M.Hex("#ffe23c"), key);

                case "p_chest":
                    return Bake(40, (g, r) =>
                    {
                        var body = new[] { V(-r * .5f, -r * .18f), V(r * .5f, -r * .18f), V(r * .5f, r * .42f), V(-r * .5f, r * .42f) };
                        g.FillPoly(body, M.Hex("#3a2a12"));
                        g.StrokePoly(body, Gold, 2.4f);
                        g.StrokeArc(V(0, -r * .18f), r * .5f, Mathf.PI, M.TAU, Gold, 2.4f);
                        g.FillRect(-r * .09f, -r * .3f, r * .18f, r * .34f, M.Hex("#ffe9a8"));
                    }, 18, Gold, key);

                // ---------------- KHÁC ----------------
                case "glow":
                    return Bake(128, (g, r) => g.RadialGlow(r, Color.white, .8f), 0, Color.white, key);
                case "spark":
                    return Bake(32, (g, r) => g.RadialGlow(r, Color.white, 1f), 0, Color.white, key);
                case "shadow":
                    return Bake(64, (g, r) => g.RadialGlow(r, new Color(0, 0, 0, .55f), 1.4f), 0, Color.white, key);
                case "px":
                    return Bake(8, (g, r) => g.FillRect(-r, -r, r * 2, r * 2, Color.white), 0, Color.white, key);

                case "ring":     // vòng tròn rỗng cho sóng xung kích
                    return Bake(96, (g, r) => g.StrokeCircle(V(0, 0), r * .86f, Color.white, r * .1f), 0, Color.white, key);

                case "vignette": // tối dần ra 4 góc
                    return Bake(256, (g, r) =>
                    {
                        for (int i = 0; i < 46; i++)
                        {
                            float t = i / 45f;
                            float rad = Mathf.Lerp(r * .42f, r * 1.42f, t);
                            g.StrokeCircle(V(0, 0), rad, new Color(0, 0, 0, .055f * t * t), r * .05f);
                        }
                    }, 0, Color.white, key);

                /* NHẬT THỰC — bóng tối bọc quanh người chơi. Chừa một vòng sáng đủ rộng
                   để vẫn thấy đạn bay tới; tối hẳn thì không phải khó, chỉ là chết oan.
                   Sprite rộng 256 px được phóng lên 2800 đơn vị thế giới trong GameCtrl,
                   nên lỗ 190 đơn vị = .136 bán kính, tối hẳn ở 430 = .307 bán kính. */
                case "eclipse":
                    return Bake(256, (g, r) => g.RadialHole(r * .136f, r * .307f, new Color(6 / 255f, 3 / 255f, 2 / 255f, 1f)),
                                0, Color.white, key);

                case "gridcell": // một ô lưới nền, lặp lại khắp đấu trường
                    return Bake(80, (g, r) =>
                    {
                        // đường phải đủ dày, không thì thu nhỏ xuống là mất tăm
                        var faint = new Color(90 / 255f, 130 / 255f, 220 / 255f, .38f);
                        g.FillRect(-r, -r, r * 2f, 3f, faint);
                        g.FillRect(-r, -r, 3f, r * 2f, faint);
                    }, 0, Color.white, key);

                default:
                    // vũ khí / trang bị
                    if (key.StartsWith("w_")) return BuildWeaponIcon(key.Substring(2), key);
                    if (key.StartsWith("i_")) return BuildPassiveIcon(key.Substring(2), key);
                    if (key.StartsWith("s_"))
                    {
                        var sd = Sigils.All[key.Substring(2)];
                        return Bake(72, (g, r) => sd.DrawIcon(g, r * .82f), 15, sd.Color, key);
                    }
                    return Bake(32, (g, r) => g.Neon(TexCanvas.PolyPoints(4, r * .6f), Color.white, 3, Dark), 10, Color.white, key);
            }
        }

        static Vector2[] HeartPoints(float s)
        {
            // trái tim xấp xỉ bằng đường cong tham số
            var p = new Vector2[24];
            for (int i = 0; i < 24; i++)
            {
                float t = i / 24f * M.TAU;
                float x = 16f * Mathf.Pow(Mathf.Sin(t), 3f);
                float y = -(13f * Mathf.Cos(t) - 5f * Mathf.Cos(2 * t) - 2f * Mathf.Cos(3 * t) - Mathf.Cos(4 * t));
                p[i] = new Vector2(x / 16f * s, y / 16f * s);
            }
            return p;
        }

        // ---------------- icon vũ khí ----------------
        static Sprite BuildWeaponIcon(string id, string key)
        {
            var def = GameData.Weapons[id];
            return Bake(72, (g, r) => def.DrawIcon(g, r * .82f), 14, def.Color, key);
        }

        // ---------------- icon trang bị ----------------
        static Sprite BuildPassiveIcon(string id, string key)
        {
            var def = GameData.Passives[id];
            return Bake(72, (g, r) => def.DrawIcon(g, r * .82f), 14, def.Color, key);
        }
    }
}
