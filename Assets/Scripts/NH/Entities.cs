// ============================================================
//  NEON HORDE — thực thể: người chơi, quái, đạn, vật phẩm
//  Mỗi thực thể gồm phần DỮ LIỆU + một SpriteRenderer tái sử dụng.
// ============================================================
using System.Collections.Generic;
using UnityEngine;

namespace NH
{
    /// <summary>Thứ tự vẽ (sortingOrder) của từng lớp.</summary>
    public static class Layer
    {
        public const int Ground = -60;
        public const int Pickup = -20;
        public const int EBullet = -10;
        public const int Enemy = 0;
        public const int Player = 10;
        public const int Bullet = 20;
        public const int Fx = 30;
        public const int Text = 40;
    }

    /// <summary>Nơi chứa các GameObject tái sử dụng, cho Hierarchy đỡ rối.</summary>
    public static class ViewRoot
    {
        public static Transform Enemies, Bullets, Pickups, Effects;

        public static void Ensure()
        {
            if (Enemies != null) return;
            Enemies = New("~Enemies");
            Bullets = New("~Bullets");
            Pickups = New("~Pickups");
            Effects = New("~Effects");
        }

        static Transform New(string n) => new GameObject(n).transform;

        public static SpriteRenderer NewSprite(Transform parent, int order, string name)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sortingOrder = order;
            go.SetActive(false);
            return sr;
        }
    }

    // =========================================================
    //  NGƯỜI CHƠI
    // =========================================================
    public class Player
    {
        public CharDef ch;
        public Vector2 pos, vel;
        public float r = 14f;
        public float face = Mathf.PI * .5f;
        public float hp = 100f, maxHp = 100f;
        public float dashT, dashCd, iframe, walkT, trailT;
        public Vector2 dashDir = Vector2.up;
        public int level = 1;
        public float xp;
        public int xpNext = 5;
        public float bladeAng;

        public SpriteRenderer sr;
        public SpriteRenderer shadow;
        public Transform tr;
        readonly List<SpriteRenderer> blades = new List<SpriteRenderer>();

        public void BuildView()
        {
            var go = new GameObject("Player");
            tr = go.transform;
            sr = go.AddComponent<SpriteRenderer>();
            sr.sortingOrder = Layer.Player;
            sr.sprite = Art.Get(ch.Sprite);

            var sh = new GameObject("shadow");
            sh.transform.SetParent(tr, false);
            shadow = sh.AddComponent<SpriteRenderer>();
            shadow.sprite = Art.Get("shadow");
            shadow.sortingOrder = Layer.Player - 1;
            shadow.color = new Color(0, 0, 0, .45f);
            sh.transform.localScale = new Vector3(.7f, .35f, 1f);
            sh.transform.localPosition = new Vector3(0, -8f, 0);
        }

        public void DestroyView()
        {
            if (tr != null) Object.Destroy(tr.gameObject);
            foreach (var b in blades) if (b != null) Object.Destroy(b.gameObject);
            blades.Clear();
            tr = null; sr = null;
        }

        public void Tick(GameCtrl G, float dt)
        {
            var S = G.Stats;
            Vector2 input = InputCtrl.Move;

            /* ===== LUẬT ĐẤU TRƯỜNG =====
             * G.BossRule chỉ khác null trong lúc đang đánh trùm. Mọi luật đều bóp
             * DI CHUYỂN / TẦM NHÌN / HỒI MÁU — không luật nào đụng vào vũ khí, vì bắn
             * là tự động: khoá vũ khí thì người chơi chỉ còn ngồi nhìn. */
            string rule = G.BossRule;

            /* ĐẢO CHIỀU: lật ngay sau khi đọc input để đi, lướt, hướng mặt cùng lật. */
            if (rule == "inverted") input = -input;

            // ---- lướt ----
            dashCd = Mathf.Max(0f, dashCd - dt);
            bool wantDash = InputCtrl.ConsumeDash();     // luôn phải gọi để xoá đệm phím
            if (wantDash && rule == "chained" && dashCd <= 0f)
            {
                // XIỀNG XÍCH: báo cho người chơi biết là bị khoá, đừng im lặng nuốt phím
                Fx.Ring(pos, 34f, M.Hex("#ffb02e"), .22f, 3f);
                Sfx.Play("dashBlocked", .8f);
                dashCd = .35f;
            }
            else if (wantDash && dashCd <= 0f)
            {
                dashDir = (input.sqrMagnitude > .01f) ? input.normalized : M.Dir(face);
                dashT = .19f; dashCd = 1.5f; iframe = Mathf.Max(iframe, .28f);
                Sfx.Play("dash", .7f);
                Fx.Shake(3f);
                Fx.Burst(pos, 16, Art.Cyan, 300f, .4f, 5f);
                Fx.Ring(pos, 46f, Art.Cyan, .3f, 3f);
            }

            // Ấn Phượng Hoàng tầng 3: máu thấp thì chạy nhanh hơn
            float spd = 218f * S.moveSpeed * (G.Rage ? 1.35f : 1f);
            if (rule == "frostbite") spd *= .65f;        // BĂNG GIÁ
            Vector2 want;
            if (dashT > 0f)
            {
                dashT -= dt;
                want = dashDir * spd * 3.6f;
                Fx.Afterimage(pos, face, sr.sprite, tr.localScale, ch.Color);
                Fx.Trail(pos + new Vector2(M.Rnd(-8f, 8f), M.Rnd(-8f, 8f)), Art.Cyan, 5f, .28f);
            }
            else want = input * spd;

            /* HẤP LỰC: trùm kéo người chơi về phía nó. 96 so với tốc gốc 218 —
               đủ để không đứng yên được, nhưng vẫn thoát ra được nếu chủ động chạy. */
            if (rule == "gravity" && G.Boss != null && !G.Boss.dead)
            {
                Vector2 d = G.Boss.pos - pos;
                if (d.sqrMagnitude > .01f) want += d.normalized * 96f;
            }

            vel = M.Damp(vel, want, .00003f, dt);
            pos += vel * dt;

            float B = G.Arena - r;
            if (pos.x < -B) { pos.x = -B; vel.x = 0; }
            if (pos.x > B) { pos.x = B; vel.x = 0; }
            if (pos.y < -B) { pos.y = -B; vel.y = 0; }
            if (pos.y > B) { pos.y = B; vel.y = 0; }

            float sp = vel.magnitude;
            if (sp > 12f) { face = Mathf.Atan2(vel.y, vel.x); walkT += dt * sp * .045f; }

            iframe = Mathf.Max(0f, iframe - dt);

            // regen — KHÁT MÁU chặn hồi máu tự động (tim rơi ra vẫn ăn được)
            if (S.regen > 0f && hp < maxHp && rule != "bloodthirst")
                hp = Mathf.Min(maxHp, hp + S.regen * dt);

            trailT -= dt;
            if (sp > 40f && trailT <= 0f)
            {
                trailT = .05f;
                Fx.Spark(pos - M.Dir(face) * 10f,
                         -vel * .12f + new Vector2(M.Rnd(-20f, 20f), M.Rnd(-20f, 20f)),
                         .3f, 4f, ch.Color);
            }

            // ---- hiển thị ----
            float bob = Mathf.Sin(walkT) * 1.6f;
            tr.position = new Vector3(pos.x, pos.y + bob, 0f);
            tr.rotation = Quaternion.Euler(0, 0, face * Mathf.Rad2Deg - 90f);
            float s = (r * 2.5f) / sr.sprite.texture.width;
            tr.localScale = new Vector3(s, s, 1f);
            sr.color = iframe > 0f
                ? new Color(1f, 1f, 1f, .55f + Mathf.Sin(G.Time * 40f) * .25f)
                : Color.white;

            UpdateBlades(G, dt);
        }

        public struct BladeRing { public int n; public float rad, size, hitR, ang; }
        static readonly List<BladeRing> ringBuf = new List<BladeRing>(2);

        /// <summary>
        /// Vị trí các lưỡi kiếm. Bản tiến hoá THIÊN LUÂN có HAI vòng quay ngược chiều.
        /// Dùng chung cho cả phần vẽ lẫn phần tính va chạm.
        /// </summary>
        public List<BladeRing> BladeRings(GameCtrl G)
        {
            ringBuf.Clear();
            var w = G.FindWeapon("blade");
            if (w == null) return ringBuf;

            var st = GameData.Weapons["blade"].Stat(w.lv);
            int n = st.n + G.Stats.proj + (w.evolved ? 2 : 0);
            float rad = st.rad * G.Stats.area * (w.evolved ? 1.15f : 1f);

            ringBuf.Add(new BladeRing
            {
                n = n, rad = rad, ang = bladeAng,
                size = 26f * G.Stats.area * (w.evolved ? 1.1f : 1f),
                hitR = 17f * G.Stats.area * (w.evolved ? 1.1f : 1f)
            });
            if (w.evolved)
                ringBuf.Add(new BladeRing
                {
                    n = Mathf.Max(2, n - 2), rad = rad * .55f, ang = -bladeAng * 1.45f,
                    size = 18f * G.Stats.area, hitR = 12f * G.Stats.area
                });
            return ringBuf;
        }

        void UpdateBlades(GameCtrl G, float dt)
        {
            var w = G.FindWeapon("blade");
            if (w != null)
            {
                var st = GameData.Weapons["blade"].Stat(w.lv);
                bladeAng += st.rot * (w.evolved ? 1.15f : 1f) * dt;
            }

            var rings = BladeRings(G);
            int total = 0;
            foreach (var r in rings) total += r.n;

            while (blades.Count < total)
            {
                var sr2 = ViewRoot.NewSprite(ViewRoot.Effects, Layer.Bullet, "blade");
                sr2.sprite = Art.Get("b_blade");
                blades.Add(sr2);
            }

            int idx = 0;
            float texW = Art.Get("b_blade").texture.width;
            foreach (var ring in rings)
            {
                for (int i = 0; i < ring.n; i++, idx++)
                {
                    var sr2 = blades[idx];
                    if (!sr2.gameObject.activeSelf) sr2.gameObject.SetActive(true);
                    float a = ring.ang + i / (float)ring.n * M.TAU;
                    Vector2 p = pos + M.Dir(a) * ring.rad;
                    sr2.transform.position = new Vector3(p.x, p.y, 0f);
                    sr2.transform.rotation = Quaternion.Euler(0, 0, a * Mathf.Rad2Deg - 90f);
                    float s2 = ring.size / texW;
                    sr2.transform.localScale = new Vector3(s2, s2, 1f);
                }
            }
            for (; idx < blades.Count; idx++)
                if (blades[idx].gameObject.activeSelf) blades[idx].gameObject.SetActive(false);
        }
    }

    // =========================================================
    //  QUÁI
    // =========================================================
    public class Enemy
    {
        public int uid;
        public EnemyDef def;
        public BossDef bossDef;
        public string type, sprite;
        public Vector2 pos, vel;
        public float r, scale = 1f, hp, maxHp, spd, dmg, knockRes;
        public int xp, split;
        public Color color;
        public string ai;
        public bool elite, boss, dead;
        public float flash, slowT, slowAmt, stunT, hitCd, bladeCd, spawnT, rot;
        public bool frozen;                    // Ấn Băng Tinh: bị đóng băng nguyên khối
        public float t, t2;
        public int state, subCount, pattern;
        public float patternT, telegraph, ang;
        public float swept;                    // laserCross: tổng góc ĐÃ quét, xem chú thích ở pattern

        // TRÙNG MẪU đẻ ra: nghiêng về swarm, nhưng có bomber/splitter để cộng hưởng luật TÁCH BẦY
        static readonly string[] BroodKinds = { "swarm", "swarm", "bomber", "splitter" };

        public SpriteRenderer sr;
        Transform tr;
        SpriteRenderer bar, barBg;

        public Enemy()
        {
            ViewRoot.Ensure();
            sr = ViewRoot.NewSprite(ViewRoot.Enemies, Layer.Enemy, "enemy");
            tr = sr.transform;
        }

        public void Setup(EnemyDef d, string typeId, Vector2 p, float hpv, float dmgv, int xpv,
                          bool isElite, bool isBoss, BossDef bd, float scaleMul, float spdMul)
        {
            uid = ++GameCtrl.UidCounter;
            def = d; type = typeId; bossDef = bd;
            pos = p; vel = Vector2.zero;
            scale = scaleMul;
            r = d.R * scaleMul;
            maxHp = hp = hpv;
            spd = d.Spd * spdMul;
            dmg = dmgv; xp = xpv;
            sprite = d.Sprite; color = d.Color;
            ai = isBoss ? "boss" : d.Ai;
            knockRes = d.KnockRes; split = d.Split;
            elite = isElite; boss = isBoss;
            flash = slowT = slowAmt = stunT = hitCd = bladeCd = 0f;
            frozen = false;
            t = M.Rnd(3f); t2 = 0f; ang = M.Rnd(M.TAU);
            state = 0; subCount = 0; pattern = 0; patternT = 2.5f; telegraph = 0f; swept = 0f;
            spawnT = isBoss ? 1f : .35f;
            dead = false;

            sr.sprite = Art.Get(sprite);
            sr.color = Color.white;
            sr.sortingOrder = boss ? Layer.Enemy + 5 : Layer.Enemy;
            sr.gameObject.SetActive(true);
        }

        public void Recycle()
        {
            if (sr != null) sr.gameObject.SetActive(false);
            if (bar != null) bar.gameObject.SetActive(false);
            if (barBg != null) barBg.gameObject.SetActive(false);
        }

        public void Tick(GameCtrl G, float dt)
        {
            var p = G.Player;
            if (spawnT > 0f) spawnT -= dt;
            flash = Mathf.Max(0f, flash - dt * 5f);
            if (slowT > 0f) { slowT -= dt; if (slowT <= 0f) slowAmt = 0f; }

            if (stunT > 0f)
            {
                stunT -= dt;
                pos += vel * dt;
                vel *= Mathf.Pow(.001f, dt);
                return;
            }

            hitCd = Mathf.Max(0f, hitCd - dt);
            bladeCd = Mathf.Max(0f, bladeCd - dt);
            t += dt;

            float mv = spd * (1f - slowAmt);
            float a = M.Ang(pos, p.pos);
            float d = Vector2.Distance(pos, p.pos);
            rot = a;

            if (boss) { TickBoss(G, dt, a, d, mv); return; }

            Vector2 want = Vector2.zero;
            switch (ai)
            {
                case "shoot":
                    {
                        float rng = def.Range;
                        if (d > rng) want = M.Dir(a) * mv;
                        else if (d < rng * .7f) want = -M.Dir(a) * mv * .8f;
                        else want = M.Dir(a + Mathf.PI * .5f) * mv * .7f;
                        t2 -= dt;
                        if (t2 <= 0f && d < rng * 1.4f && spawnT <= 0f)
                        {
                            t2 = 2.2f + M.Rnd(.6f);
                            G.SpawnEBullet(pos, a, 250f, dmg * .8f, M.Hex("#3ce0ff"));
                            Sfx.Play("enemyShot", .35f, M.Rnd(.9f, 1.1f), 60f);
                        }
                        break;
                    }
                case "charge":
                    if (state == 0)
                    {
                        want = M.Dir(a) * mv * .55f;
                        if (d < 260f) { state = 1; t2 = .7f; ang = a; }
                    }
                    else if (state == 1)
                    {
                        t2 -= dt;
                        want = -M.Dir(ang) * 40f;
                        if (t2 <= 0f) { state = 2; t2 = .55f; Fx.Ring(pos, 34f, M.Hex("#ffe23c"), .3f, 3f); }
                    }
                    else
                    {
                        t2 -= dt;
                        want = M.Dir(ang) * mv * 6.5f;
                        Fx.Trail(pos, M.Hex("#ffe23c"), 4f, .22f);
                        if (t2 <= 0f) state = 0;
                    }
                    break;
                case "orbit":
                    {
                        float radial = Mathf.Clamp((d - 130f) * 2.2f, -mv, mv);
                        want = M.Dir(a) * radial + M.Dir(a + Mathf.PI * .5f) * mv;
                        break;
                    }
                default:
                    {
                        float wob = Mathf.Sin(t * 2.4f + uid) * .28f;
                        want = M.Dir(a + wob) * mv;
                        break;
                    }
            }

            vel = M.Damp(vel, want, .0006f, dt);
            pos += vel * dt;

            float B = G.Arena - r;
            pos.x = Mathf.Clamp(pos.x, -B, B);
            pos.y = Mathf.Clamp(pos.y, -B, B);
        }

        void TickBoss(GameCtrl G, float dt, float a, float d, float mv)
        {
            patternT -= dt;
            string pat = bossDef.Patterns[pattern % bossDef.Patterns.Length];

            if (state == 0)
            {
                vel = M.Damp(vel, M.Dir(a) * mv, .0006f, dt);
                if (patternT <= 0f) { state = 1; t2 = 0f; subCount = 0; telegraph = .6f; }
            }
            else
            {
                if (telegraph > 0f)
                {
                    telegraph -= dt;
                    vel *= Mathf.Pow(.02f, dt);
                    if (telegraph <= 0f) t2 = 0f;
                }
                else
                {
                    t2 += dt;
                    bool done = false;
                    switch (pat)
                    {
                        case "radial":
                            if (t2 > .28f)
                            {
                                t2 = 0f; subCount++;
                                for (int i = 0; i < 14; i++)
                                    G.SpawnEBullet(pos, i / 14f * M.TAU + subCount * .3f, 210f, dmg * .55f, color);
                                Fx.Shake(3f);
                                if (subCount >= 4) done = true;
                            }
                            break;
                        case "spiral":
                            if (t2 > .07f)
                            {
                                t2 = 0f; subCount++;
                                for (int i = 0; i < 3; i++)
                                    G.SpawnEBullet(pos, subCount * .42f + i / 3f * M.TAU, 190f, dmg * .45f, color);
                                if (subCount >= 34) done = true;
                            }
                            break;
                        case "charge":
                            if (subCount == 0) { ang = a; subCount = 1; t2 = 0f; }
                            vel = M.Dir(ang) * mv * 7.5f;
                            Fx.Trail(pos, color, 9f, .3f);
                            if (t2 > .8f) done = true;
                            break;
                        case "summon":
                            if (t2 > .3f)
                            {
                                t2 = 0f; subCount++;
                                for (int i = 0; i < 3; i++)
                                {
                                    float sa = M.Rnd(M.TAU);
                                    G.SpawnEnemy(M.Chance(.5f) ? "swarm" : "grunt", pos + M.Dir(sa) * 70f, false);
                                }
                                Fx.Ring(pos, 90f, color, .4f, 4f);
                                if (subCount >= 3) done = true;
                            }
                            break;
                        case "laserSweep":
                            if (subCount == 0) { ang = a - 1.1f; subCount = 1; }
                            ang += dt * 1.5f;
                            vel *= Mathf.Pow(.2f, dt);
                            if (t2 > .1f)
                            {
                                t2 = 0f;
                                G.SpawnEBullet(pos, ang, 320f, dmg * .5f, color);
                                G.SpawnEBullet(pos, ang + Mathf.PI, 320f, dmg * .5f, color);
                            }
                            if (ang > a + 3.3f) done = true;
                            break;

                        /* ---- SƯƠNG HÀN VƯƠNG: ba đợt sóng băng lan ra, đạn bay chậm nên
                               phải luồn lách chứ không chạy thẳng thoát được ---- */
                        case "frostNova":
                            vel *= Mathf.Pow(.02f, dt);
                            if (t2 > .62f)
                            {
                                t2 = 0f; subCount++;
                                for (int i = 0; i < 22; i++)
                                    G.SpawnEBullet(pos, i / 22f * M.TAU + subCount * .14f, 120f + subCount * 22f, dmg * .45f, M.Hex("#9beeff"));
                                Fx.Ring(pos, 130f + subCount * 30f, M.Hex("#9beeff"), .5f, 5f);
                                Sfx.Play("sh_frost", .5f);
                                if (subCount >= 3) done = true;
                            }
                            break;

                        /* ---- NGHỊCH ẢNH: 4 cú lao liên tiếp, mỗi cú dừng lại nhả một
                               vòng đạn tại chỗ — chỗ nó vừa đứng cũng nguy hiểm ---- */
                        case "mirrorDash":
                            if (subCount == 0) { ang = a; subCount = 1; t2 = 0f; }
                            if (t2 < .40f)
                            {
                                vel = M.Dir(ang) * mv * 8f;
                                Fx.Trail(pos, color, 9f, .3f);
                            }
                            else
                            {
                                vel *= Mathf.Pow(.02f, dt);
                                if (t2 > .60f)
                                {
                                    for (int i = 0; i < 7; i++)
                                        G.SpawnEBullet(pos, i / 7f * M.TAU + subCount * .5f, 210f, dmg * .4f, color);
                                    Fx.Ring(pos, 74f, color, .35f, 4f);
                                    Fx.Shake(3f);
                                    subCount++; t2 = 0f; ang = a;      // ngắm lại người chơi trước cú kế
                                    if (subCount > 4) done = true;
                                }
                            }
                            break;

                        /* ---- HẮC NHẬT: 4 vành lửa đồng tâm, vành sau nhanh hơn vành trước
                               nên chúng dồn lại thành một bức tường đuổi theo ---- */
                        case "sunburst":
                            vel *= Mathf.Pow(.02f, dt);
                            if (t2 > .52f)
                            {
                                t2 = 0f; subCount++;
                                for (int i = 0; i < 26; i++)
                                    G.SpawnEBullet(pos, i / 26f * M.TAU + subCount * .12f, 145f + subCount * 40f, dmg * .48f, color);
                                Fx.Ring(pos, 120f + subCount * 44f, color, .5f, 6f);
                                Fx.Shake(5f);
                                Sfx.Play("explode", .45f);
                                if (subCount >= 4) done = true;
                            }
                            break;

                        /* ---- TRÙNG MẪU: đẻ ồ ạt. Cố ý trộn bomber + splitter để cộng hưởng
                               với luật TÁCH BẦY của chính nó ---- */
                        case "broodSurge":
                            vel *= Mathf.Pow(.06f, dt);
                            if (t2 > .26f)
                            {
                                t2 = 0f; subCount++;
                                for (int i = 0; i < 4; i++)
                                {
                                    float sa = M.Rnd(M.TAU), rr = M.Rnd(60f, 130f);
                                    G.SpawnEnemy(BroodKinds[Mathf.Min(3, (int)M.Rnd(4f))], pos + M.Dir(sa) * rr, false);
                                }
                                Fx.Ring(pos, 110f, color, .35f, 4f);
                                if (subCount >= 5) done = true;
                            }
                            break;

                        /* ---- VÔ TẬN: chữ thập 4 tia quay tròn. Đếm góc đã quét bằng biến
                               riêng, KHÔNG so với `a` — `a` đổi từng khung hình nên so kiểu
                               đó thì lúc quét nửa vòng lúc quét ba vòng ---- */
                        case "laserCross":
                            if (subCount == 0) { ang = a; subCount = 1; swept = 0f; }
                            ang += dt * 1.15f; swept += dt * 1.15f;
                            vel *= Mathf.Pow(.2f, dt);
                            if (t2 > .08f)
                            {
                                t2 = 0f;
                                for (int i = 0; i < 4; i++)
                                    G.SpawnEBullet(pos, ang + i / 4f * M.TAU, 340f, dmg * .42f, color);
                            }
                            if (swept > M.TAU * .85f) done = true;
                            break;
                    }
                    if (done) { state = 0; pattern++; patternT = 3.2f + M.Rnd(1.4f); subCount = 0; }
                }
            }

            pos += vel * dt;
            float B = G.Arena - r;
            pos.x = Mathf.Clamp(pos.x, -B, B);
            pos.y = Mathf.Clamp(pos.y, -B, B);

            if (M.Chance(dt * 26f))
            {
                float sa = M.Rnd(M.TAU);
                float rr = r * M.Rnd(.8f, 1.3f);
                Fx.Spark(pos + M.Dir(sa) * rr, -M.Dir(sa) * 40f, .5f, 4f, color);
            }
        }

        public void Render(GameCtrl G)
        {
            float baseScale = (r * 2.55f) / Art.Get(sprite).texture.width;
            float wob = boss ? 1f + Mathf.Sin(G.Time * 2.2f) * .04f : 1f;
            float grow = spawnT > 0f ? Mathf.Lerp(.5f, 1f, 1f - spawnT / (boss ? 1f : .35f)) : 1f;

            tr.position = new Vector3(pos.x, pos.y, 0f);
            tr.rotation = Quaternion.Euler(0, 0, rot * Mathf.Rad2Deg - 90f);
            float s = baseScale * wob * grow;
            tr.localScale = new Vector3(s, s, 1f);

            sr.sprite = flash > .04f ? Art.Flash(sprite) : Art.Get(sprite);

            Color c = Color.white;
            if (slowAmt > .05f) c = Color.Lerp(Color.white, new Color(.55f, .85f, 1f), slowAmt * .7f);
            if (elite) c *= 1f + Mathf.Sin(G.Time * 5f) * .12f;
            c.a = spawnT > 0f ? Mathf.Lerp(.25f, 1f, 1f - spawnT / (boss ? 1f : .35f)) : 1f;
            sr.color = c;

            // thanh máu cho quái tinh anh / quái to
            bool showBar = !boss && (elite || maxHp > 90f) && hp < maxHp;
            if (showBar)
            {
                if (bar == null)
                {
                    barBg = ViewRoot.NewSprite(ViewRoot.Enemies, Layer.Enemy + 2, "hpbg");
                    barBg.sprite = Art.Get("px"); barBg.color = new Color(0, 0, 0, .6f);
                    bar = ViewRoot.NewSprite(ViewRoot.Enemies, Layer.Enemy + 3, "hp");
                    bar.sprite = Art.Get("px");
                }
                float w = r * 2.2f, h = 3.4f;
                float y = pos.y + r + 8f;
                barBg.gameObject.SetActive(true); bar.gameObject.SetActive(true);
                barBg.transform.position = new Vector3(pos.x, y, 0f);
                barBg.transform.localScale = new Vector3(w / 8f, h / 8f, 1f);
                float f = Mathf.Clamp01(hp / maxHp);
                bar.color = elite ? Art.Gold : Art.Red;
                bar.transform.position = new Vector3(pos.x - w * .5f + w * f * .5f, y, 0f);
                bar.transform.localScale = new Vector3(w * f / 8f, h / 8f, 1f);
            }
            else if (bar != null && bar.gameObject.activeSelf)
            {
                bar.gameObject.SetActive(false);
                barBg.gameObject.SetActive(false);
            }
        }
    }

    // =========================================================
    //  ĐẠN CỦA NGƯỜI CHƠI
    // =========================================================
    public class BulletSpec
    {
        public Vector2 pos;
        public float ang, spd, dmg, radius, life = 2f, scale = 1f;
        public string sprite = "b_basic";
        public Color color = Color.white;
        public int pierce;
        public float knock, homing, accel, maxSpd, spin, hitCd, delay, slow, range;
        public bool boomerang, noReturn, lob, hasTrail;
        public Color trail;
        public bool hasAoe;
        public float aoeR, aoeDmg;
        public Color aoeColor;
        public bool aoeBig;
        public int aoeCluster;
        public float aoeCraterLife, aoeCraterDps;

        // cơ chế của vũ khí tiến hoá
        public int split, growCap = 6;
        public float grow;
        public bool hasTrailBoom; public float tbT, tbR, tbDmg; public Color tbColor;

        public void SetTrailBoom(float every, float r, float dmg, Color c)
        { hasTrailBoom = true; tbT = every; tbR = r; tbDmg = dmg; tbColor = c; }

        public void Reset()
        {
            pos = Vector2.zero; ang = spd = dmg = radius = 0f; life = 2f; scale = 1f;
            sprite = "b_basic"; color = Color.white;
            pierce = 0; knock = homing = accel = maxSpd = spin = hitCd = delay = slow = range = 0f;
            boomerang = noReturn = lob = hasTrail = false;
            hasAoe = false; aoeR = aoeDmg = 0f; aoeBig = false; aoeCluster = 0;
            aoeCraterLife = aoeCraterDps = 0f;
            split = 0; grow = 0f; growCap = 6;
            hasTrailBoom = false; tbT = tbR = tbDmg = 0f;
        }

        public void SetAoe(float r, float dmg2, Color c, bool big, int cluster,
                           float craterLife = 0f, float craterDps = 0f)
        {
            hasAoe = true; aoeR = r; aoeDmg = dmg2; aoeColor = c; aoeBig = big; aoeCluster = cluster;
            aoeCraterLife = craterLife; aoeCraterDps = craterDps;
        }
    }

    public class Bullet
    {
        public Vector2 pos, vel;
        public float ang, spd, dmg, radius, life, maxLife, scale, rot;
        public string sprite;
        public Color color;
        public int pierce;
        public float knock, homing, accel, maxSpd, spin, hitCd, delay, slow, range, traveled, lobT;
        public bool boomerang, noReturn, lob, returning, hasTrail, dead;
        // cơ chế của vũ khí tiến hoá
        public int split, growN, growCap;
        public float grow, boomT;
        public bool hasTrailBoom; public float tbT, tbR, tbDmg; public Color tbColor;
        public Color trail;
        public bool hasAoe; public float aoeR, aoeDmg; public Color aoeColor; public bool aoeBig; public int aoeCluster;
        public float aoeCraterLife, aoeCraterDps;
        public Enemy target;
        public readonly Dictionary<int, float> hits = new Dictionary<int, float>(8);

        public SpriteRenderer sr;
        Transform tr;

        public Bullet()
        {
            ViewRoot.Ensure();
            sr = ViewRoot.NewSprite(ViewRoot.Bullets, Layer.Bullet, "bullet");
            tr = sr.transform;
        }

        public void Setup(BulletSpec s)
        {
            pos = s.pos; ang = s.ang; spd = s.spd;
            vel = M.Dir(ang) * spd;
            dmg = s.dmg; radius = s.radius;
            life = maxLife = s.life; scale = s.scale;
            sprite = s.sprite; color = s.color;
            pierce = s.pierce; knock = s.knock; homing = s.homing;
            accel = s.accel; maxSpd = s.maxSpd; spin = s.spin;
            hitCd = s.hitCd; delay = s.delay; slow = s.slow; range = s.range;
            boomerang = s.boomerang; noReturn = s.noReturn; lob = s.lob;
            hasTrail = s.hasTrail; trail = s.trail;
            hasAoe = s.hasAoe; aoeR = s.aoeR; aoeDmg = s.aoeDmg;
            aoeColor = s.aoeColor; aoeBig = s.aoeBig; aoeCluster = s.aoeCluster;
            aoeCraterLife = s.aoeCraterLife; aoeCraterDps = s.aoeCraterDps;
            split = s.split; grow = s.grow; growCap = s.growCap; growN = 0;
            hasTrailBoom = s.hasTrailBoom; tbT = s.tbT; tbR = s.tbR; tbDmg = s.tbDmg; tbColor = s.tbColor;
            boomT = 0f;
            traveled = 0f; lobT = 0f; returning = false; rot = ang;
            target = null; dead = false;
            hits.Clear();

            sr.sprite = Art.Get(sprite);
            sr.color = Color.white;
            sr.gameObject.SetActive(true);
        }

        public void Recycle() { if (sr != null) sr.gameObject.SetActive(false); }

        public void Tick(GameCtrl G, float dt)
        {
            if (delay > 0f) { delay -= dt; pos = G.Player.pos; return; }

            life -= dt;
            if (life <= 0f) { G.BulletExpire(this); return; }

            if (homing > 0f)
            {
                if (target == null || target.dead) target = G.NearestEnemy(pos, 900f);
                if (target != null)
                    ang += Mathf.Clamp(M.AngleDiff(M.Ang(pos, target.pos), ang), -homing * dt, homing * dt);
                if (accel > 0f) spd = Mathf.Min(maxSpd > 0f ? maxSpd : 9999f, spd + accel * dt);
                vel = M.Dir(ang) * spd;
                rot = ang;
                if (M.Chance(dt * 60f)) Fx.Spark(pos, new Vector2(M.Rnd(-30f, 30f), M.Rnd(-30f, 30f)), .3f, 4f, hasTrail ? trail : color);
            }

            if (boomerang)
            {
                traveled += spd * dt;
                if (!returning && !noReturn && traveled >= range) returning = true;
                if (returning)
                {
                    ang += Mathf.Clamp(M.AngleDiff(M.Ang(pos, G.Player.pos), ang), -7f * dt, 7f * dt);
                    vel = M.Dir(ang) * spd;
                    if (Vector2.Distance(pos, G.Player.pos) < 26f) { dead = true; return; }
                }
                else if (noReturn && traveled >= range)
                {
                    float wa = M.Ang(pos, G.Player.pos) + Mathf.PI / 2.2f;
                    ang += Mathf.Clamp(M.AngleDiff(wa, ang), -3.2f * dt, 3.2f * dt);
                    vel = M.Dir(ang) * spd;
                }
                rot += spin * dt;
            }

            if (lob) lobT += dt;

            pos += vel * dt;
            if (!boomerang && homing <= 0f) rot += spin * dt;

            if (hasTrail && M.Chance(dt * 40f)) Fx.Trail(pos, trail, 3f, .22f);

            // PHÁO HẠM: rải một chuỗi vụ nổ dọc theo đường bay
            if (hasTrailBoom)
            {
                boomT -= dt;
                if (boomT <= 0f)
                {
                    boomT = tbT;
                    G.MiniBoom(pos, tbR, tbDmg, tbColor);
                }
            }

            float B = G.Arena + 90f;
            if (pos.x < -B || pos.x > B || pos.y < -B || pos.y > B) G.BulletExpire(this);
        }

        public void Render()
        {
            if (delay > 0f) { sr.enabled = false; return; }
            sr.enabled = true;
            float yoff = 0f, s = (radius * 2.6f) / Art.Get(sprite).texture.width;
            if (lob)
            {
                float t = Mathf.Clamp01(lobT / maxLife);
                yoff = Mathf.Sin(t * Mathf.PI) * 62f;
                s *= 1f + Mathf.Sin(t * Mathf.PI) * .35f;
            }
            tr.position = new Vector3(pos.x, pos.y + yoff, 0f);
            tr.rotation = Quaternion.Euler(0, 0, rot * Mathf.Rad2Deg - 90f);
            tr.localScale = new Vector3(s, s, 1f);
        }
    }

    // =========================================================
    //  ĐẠN CỦA QUÁI
    // =========================================================
    public class EBullet
    {
        public Vector2 pos, vel;
        public float dmg, life, r = 7f, rot;
        public Color color;
        public bool dead;
        public SpriteRenderer sr;
        Transform tr;

        public EBullet()
        {
            ViewRoot.Ensure();
            sr = ViewRoot.NewSprite(ViewRoot.Bullets, Layer.EBullet, "ebullet");
            sr.sprite = Art.Get("b_enemy");
            tr = sr.transform;
        }

        public void Setup(Vector2 p, float ang, float spd, float d, Color c)
        {
            pos = p; vel = M.Dir(ang) * spd; dmg = d; color = c;
            life = 4.5f; rot = ang; dead = false;
            sr.color = c;
            sr.gameObject.SetActive(true);
            tr.localScale = Vector3.one * .9f;
        }

        public void Recycle() { if (sr != null) sr.gameObject.SetActive(false); }

        public void Tick(GameCtrl G, float dt)
        {
            life -= dt;
            if (life <= 0f) { dead = true; return; }
            pos += vel * dt;
            float B = G.Arena + 60f;
            if (pos.x < -B || pos.x > B || pos.y < -B || pos.y > B) dead = true;
        }

        public void Render()
        {
            tr.position = new Vector3(pos.x, pos.y, 0f);
            tr.rotation = Quaternion.Euler(0, 0, rot * Mathf.Rad2Deg - 90f);
        }
    }

    // =========================================================
    //  VẬT PHẨM
    // =========================================================
    public enum PickKind { Xp, Coin, Heart, Magnet, Nuke, Chest }

    public class Pickup
    {
        public Vector2 pos, vel;
        public PickKind kind;
        public float value, t, life;
        public bool magnetized, dead;
        public string sprite;
        public SpriteRenderer sr;
        Transform tr;

        public Pickup()
        {
            ViewRoot.Ensure();
            sr = ViewRoot.NewSprite(ViewRoot.Pickups, Layer.Pickup, "pickup");
            tr = sr.transform;
        }

        public void Setup(Vector2 p, PickKind k, float v)
        {
            pos = p; kind = k; value = v;
            vel = new Vector2(M.Rnd(-90f, 90f), M.Rnd(-90f, 90f));
            t = M.Rnd(M.TAU); magnetized = false; life = 40f; dead = false;

            sprite = k switch
            {
                PickKind.Xp => value >= 12f ? "p_xp3" : (value >= 4f ? "p_xp2" : "p_xp1"),
                PickKind.Coin => "p_coin",
                PickKind.Heart => "p_heart",
                PickKind.Magnet => "p_magnet",
                PickKind.Nuke => "p_nuke",
                _ => "p_chest"
            };
            sr.sprite = Art.Get(sprite);
            sr.color = Color.white;
            sr.gameObject.SetActive(true);
        }

        public void Recycle() { if (sr != null) sr.gameObject.SetActive(false); }

        public void Tick(GameCtrl G, float dt)
        {
            var p = G.Player;
            t += dt;
            life -= dt;
            if (life <= 0f && kind == PickKind.Xp) { dead = true; return; }

            float d = Vector2.Distance(pos, p.pos);
            if (!magnetized && d < G.Stats.pickup) magnetized = true;

            if (magnetized)
            {
                // Phải kẹp giá trị: khi nhặt Nam Châm, ngọc ở rất xa sẽ cho lực ÂM
                // => bị đẩy ra xa => càng xa lực càng âm => tăng tốc vô hạn => NaN.
                float pull = Mathf.Clamp(340f + (G.Stats.pickup - d) * 4.5f, 260f, 1500f);
                vel = M.Damp(vel, M.Dir(M.Ang(pos, p.pos)) * pull, .002f, dt);
            }
            else vel *= Mathf.Pow(.02f, dt);

            pos += vel * dt;
            if (d < p.r + 12f) { G.Collect(this); dead = true; }
        }

        public void Render()
        {
            float bob = Mathf.Sin(t * 4f) * 2.2f;
            float target = kind == PickKind.Chest ? 40f : (kind == PickKind.Xp ? 17f : 22f);
            float s = target * 1.5f / Art.Get(sprite).texture.width;
            tr.position = new Vector3(pos.x, pos.y + bob, 0f);
            tr.localScale = new Vector3(s, s, 1f);
            if (kind == PickKind.Xp) tr.rotation = Quaternion.Euler(0, 0, t * 92f);
        }
    }
}
