// ============================================================
//  NEON HORDE — bộ điều khiển chính
//  Vòng lặp game, màn chơi, sinh quái, va chạm, sát thương, nâng cấp.
// ============================================================
using System;
using System.Collections.Generic;
using UnityEngine;

namespace NH
{
    public enum GState { Menu, Playing, LevelUp, Pause, Dead }

    public class Offer
    {
        public string Kind;            // evo | wup | wnew | pas | heal
        public string Id;
        public int Lv;
        public float W;
    }

    public class GameCtrl : MonoBehaviour
    {
        public static GameCtrl I;
        public static int UidCounter;

        // ---------- trạng thái ----------
        public GState State = GState.Menu;
        public float Time_;
        public float Time => Time_;
        public float RunTime;
        /* Arena co lại được (luật THU HẸP của VÔ TẬN) nên KHÔNG còn readonly.
           ArenaFull là kích thước gốc để còn biết đường trả lại. */
        public float Arena = ArenaFull;
        public const float ArenaFull = 1500f;

        // Luật đấu trường đang có hiệu lực; null khi không đánh trùm. Xem GameData.BossRules.
        public string BossRule;
        public float EclipseT;

        public Player Player;
        public Stats Stats = Stats.Base();
        public readonly List<WeaponInst> Weapons = new List<WeaponInst>();
        public readonly List<PassiveInst> Passives = new List<PassiveInst>();
        public readonly List<SigilInst> SigilList = new List<SigilInst>();
        public bool Rage;                    // Ấn Phượng Hoàng tầng 3

        public int Wave = 1;
        public float WaveTime, WaveDur = 30f;
        public int Kills, Gold;
        public float DmgDealt;
        public int PendingLevels;
        public Enemy Boss;
        bool waveClearing;
        float spawnT;

        float slowmo = 1f, slowmoT;
        int dmgBudget;

        // ---------- kho ----------
        public Pool<Enemy> Enemies;
        public Pool<Bullet> Bullets;
        public Pool<EBullet> EBullets;
        public Pool<Pickup> Pickups;

        readonly SpatialGrid grid = new SpatialGrid(110f);
        readonly List<Enemy> q = new List<Enemy>(128);
        readonly List<Enemy> q2 = new List<Enemy>(128);
        readonly BulletSpec spec = new BulletSpec();

        /// <summary>Vùng gây sát thương theo thời gian (vũng điện, hố phóng xạ, bão tuyết).</summary>
        public class Zone
        {
            public Vector2 p;
            public float r, life, maxLife, dps, slow, dmgT, fx;
            public Color color;
            public bool follow;
            public SpriteRenderer view;
        }
        public readonly List<Zone> Zones = new List<Zone>(24);
        readonly List<SpriteRenderer> zoneViews = new List<SpriteRenderer>(24);
        readonly List<SpriteRenderer> holeCore = new List<SpriteRenderer>(4);
        readonly List<SpriteRenderer> holeRing = new List<SpriteRenderer>(4);

        // hẹn giờ theo THỜI GIAN GAME (tạm dừng thì dừng theo)
        struct Timer { public float t; public Action fn; }
        readonly List<Timer> timers = new List<Timer>(16);

        // ---------- camera / nền ----------
        public Camera Cam;
        Transform camTr;
        Vector2 camPos;
        Transform gridQuad;
        Material gridMat;              // giữ lại để đổi tiling khi đấu trường co (luật THU HẸP)
        LineRenderer border;
        SpriteRenderer centerGlow, auraRing;
        SpriteRenderer eclipseSr;      // NHẬT THỰC — bám theo người chơi, xem TickEclipse()

        // =========================================================
        void Awake()
        {
            I = this;
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;

            ViewRoot.Ensure();
            Art.WarmAll();                        // nướng sẵn TẤT CẢ sprite, tránh khựng giữa trận
            Fx.Init();
            Sfx.Ensure();

            Enemies = new Pool<Enemy>(e => e.dead, e => e.Recycle());
            Bullets = new Pool<Bullet>(b => b.dead, b => b.Recycle());
            EBullets = new Pool<EBullet>(b => b.dead, b => b.Recycle());
            Pickups = new Pool<Pickup>(p => p.dead, p => p.Recycle());

            BuildCamera();
            BuildWorld();
        }

        void BuildCamera()
        {
            // dùng lại camera có sẵn trong scene nếu có, tránh render hai lần
            Cam = Camera.main;
            GameObject go;
            if (Cam != null) go = Cam.gameObject;
            else
            {
                go = new GameObject("MainCamera");
                Cam = go.AddComponent<Camera>();
            }
            Cam.orthographic = true;
            Cam.backgroundColor = new Color(6 / 255f, 7 / 255f, 13 / 255f);
            Cam.clearFlags = CameraClearFlags.SolidColor;
            Cam.nearClipPlane = -100f;
            Cam.farClipPlane = 100f;
            Cam.transform.position = new Vector3(0, 0, -10f);
            go.tag = "MainCamera";
            camTr = go.transform;
            ApplyCameraSize();
        }

        void ApplyCameraSize()
        {
            float aspect = Screen.height > 0 ? (float)Screen.width / Screen.height : 1.6f;
            Cam.orthographicSize = Mathf.Max(360f, 300f / Mathf.Max(.2f, aspect));
        }

        void BuildWorld()
        {
            // ---- lưới nền ----
            var quad = GameObject.CreatePrimitive(PrimitiveType.Quad);
            quad.name = "~Grid";
            var col = quad.GetComponent<Collider>();
            if (col != null) Destroy(col);
            gridQuad = quad.transform;
            gridQuad.position = new Vector3(0, 0, 5f);
            gridQuad.localScale = new Vector3(Arena * 2f, Arena * 2f, 1f);

            var gtex = Art.Get("gridcell").texture;
            gtex.wrapMode = TextureWrapMode.Repeat;
            // Dùng chính shader của game (đã khai báo Always Included) thay vì
            // Shader.Find("Unlit/Transparent") — shader dựng sẵn của Unity bị loại
            // khỏi bản build nếu không asset nào tham chiếu, khiến lưới biến mất.
            var mat = new Material(Fx.Additive.shader)
            {
                mainTexture = gtex,
                mainTextureScale = new Vector2(Arena * 2f / 80f, Arena * 2f / 80f),
                renderQueue = 1900
            };
            mat.SetColor("_Color", Color.white);
            quad.GetComponent<MeshRenderer>().sharedMaterial = mat;
            gridMat = mat;

            // ---- quầng sáng giữa đấu trường ----
            centerGlow = ViewRoot.NewSprite(ViewRoot.Effects, Layer.Ground - 2, "~CenterGlow");
            centerGlow.sprite = Art.Get("glow");
            centerGlow.sharedMaterial = Fx.Additive;
            centerGlow.color = new Color(.16f, .22f, .45f, .5f);
            centerGlow.transform.localScale = Vector3.one * (Arena * 2f / 128f);
            centerGlow.gameObject.SetActive(true);

            // ---- viền đấu trường ----
            var bgo = new GameObject("~Border");
            border = bgo.AddComponent<LineRenderer>();
            border.useWorldSpace = true;
            border.loop = true;
            border.positionCount = 4;
            border.startWidth = border.endWidth = 5f;
            border.material = Fx.AdditiveWhite;
            border.sortingOrder = Layer.Ground;
            border.startColor = border.endColor = new Color(Art.Cyan.r, Art.Cyan.g, Art.Cyan.b, .55f);
            border.SetPosition(0, new Vector3(-Arena, -Arena, 0));
            border.SetPosition(1, new Vector3(Arena, -Arena, 0));
            border.SetPosition(2, new Vector3(Arena, Arena, 0));
            border.SetPosition(3, new Vector3(-Arena, Arena, 0));

            /* ---- lớp phủ NHẬT THỰC ----
               Làm bằng sprite trong THẾ GIỚI chứ không phải ảnh trên giao diện: giao diện
               là screen-space nên muốn bám theo người chơi phải tự đổi toạ độ màn hình mỗi
               khung hình, còn sprite thế giới chỉ cần đặt vị trí. Sprite rộng 2800 đơn vị,
               to hơn khung nhìn nhiều lần nên 4 góc màn hình luôn được phủ kín. */
            eclipseSr = ViewRoot.NewSprite(ViewRoot.Effects, Layer.Text + 1, "~Eclipse");
            eclipseSr.sprite = Art.Get("eclipse");
            eclipseSr.transform.localScale = Vector3.one * (2800f / 256f);
            eclipseSr.color = new Color(1, 1, 1, 0f);
            eclipseSr.gameObject.SetActive(false);

            // ---- vòng hào quang (vũ khí aura) ----
            auraRing = ViewRoot.NewSprite(ViewRoot.Effects, Layer.Ground, "~Aura");
            auraRing.sprite = Art.Get("glow");
            auraRing.sharedMaterial = Fx.Additive;
        }

        // =========================================================
        //  BẮT ĐẦU / KẾT THÚC VÁN
        // =========================================================
        public void StartRun(string charId)
        {
            Player?.DestroyView();

            Player = new Player { ch = GameData.Char(charId) };
            Player.BuildView();

            Weapons.Clear();
            Weapons.Add(new WeaponInst { id = Player.ch.Weapon, lv = 1 });
            Passives.Clear();
            SigilList.Clear();
            Rage = false;
            Sigils.Reset();
            Zones.Clear();

            Wave = 1; WaveDur = 30f; WaveTime = WaveDur;
            waveClearing = false;
            Kills = 0; Gold = 0; DmgDealt = 0f;
            Time_ = 0f; RunTime = 0f;
            PendingLevels = 0; Boss = null; spawnT = 0f;
            slowmo = 1f; slowmoT = 0f;
            timers.Clear();
            ClearBossRule();          // ván mới phải bắt đầu với đấu trường nguyên vẹn

            Enemies.Clear(); Bullets.Clear(); EBullets.Clear(); Pickups.Clear();
            Fx.ClearAll();
            InputCtrl.Reset();

            Recalc(true);
            Player.hp = Player.maxHp;

            camPos = Vector2.zero;
            camTr.position = new Vector3(0, 0, -10f);

            State = GState.Playing;
            Sfx.StartMusic();
            Sfx.SetIntensity(.15f);
            Sfx.Play("waveStart", .7f);
            UIRoot.I.Announce("MÀN 1", Art.Cyan);
            UIRoot.I.RefreshLoadout();
        }

        public void QuitToMenu()
        {
            State = GState.Menu;
            Sfx.StopMusic();
            Enemies.Clear(); Bullets.Clear(); EBullets.Clear(); Pickups.Clear();
            Fx.ClearAll();
            Player?.DestroyView();
            Player = null;
            auraRing.gameObject.SetActive(false);
        }

        public void Recalc(bool full)
        {
            var s = Stats.Base();
            Player.ch.Apply(s);
            foreach (var p in Passives) GameData.Passives[p.id].Apply(s, p.lv);
            foreach (var q in SigilList) Sigils.All[q.id].Apply(s, q.lv);

            float oldMax = Player.maxHp;
            Stats = s;
            Player.maxHp = s.maxHp;
            if (full) Player.hp = s.maxHp;
            else if (s.maxHp > oldMax) Player.hp += s.maxHp - oldMax;
            Player.hp = Mathf.Min(Player.hp, Player.maxHp);
        }

        public WeaponInst FindWeapon(string id) => Weapons.Find(w => w.id == id);

        // =========================================================
        //  VÒNG LẶP
        // =========================================================
        void Update()
        {
            float dt = Mathf.Min(UnityEngine.Time.deltaTime, .05f);

            if (Input.GetKeyDown(KeyCode.Escape) || Input.GetKeyDown(KeyCode.P)) UIRoot.I.TogglePause();
            if (Input.GetKeyDown(KeyCode.M)) UIRoot.I.ToggleMute();

            ApplyCameraSize();

            if (State == GState.Playing) Tick(dt);
            else
            {
                InputCtrl.Tick();
                Fx.Tick(State == GState.Menu ? dt : dt * .25f);
                if (State == GState.Menu) MenuAmbience(dt);
            }

            UpdateCamera(dt);
            RenderAll();
            UIRoot.I.Tick(dt);
        }

        void MenuAmbience(float dt)
        {
            Time_ += dt;
            camPos = new Vector2(Mathf.Cos(Time_ * .09f) * 420f, Mathf.Sin(Time_ * .13f) * 340f);
            if (M.Chance(dt * 22f))
            {
                float a = M.Rnd(M.TAU), r = M.Rnd(200f, 900f);
                Color[] cols = { Art.Cyan, Art.Mag, Art.Violet, Art.Lime };
                Fx.Spark(camPos + M.Dir(a) * r, new Vector2(M.Rnd(-30f, 30f), M.Rnd(10f, 50f)),
                         M.Rnd(1.2f, 2.4f), M.Rnd(2f, 5f), M.Pick(cols));
            }
        }

        void Tick(float dt)
        {
            // ---- quay chậm ----
            if (slowmoT > 0f) { slowmoT -= dt; slowmo = M.Damp(slowmo, .28f, .001f, dt); }
            else slowmo = M.Damp(slowmo, 1f, .02f, dt);
            float sdt = dt * slowmo;

            Time_ += sdt;
            RunTime += sdt;
            dmgBudget = 9;

            InputCtrl.Tick();
            Player.Tick(this, sdt);

            // ---- dựng lại lưới va chạm ----
            grid.Clear();
            var ea = Enemies.Active;
            for (int i = 0; i < ea.Count; i++) grid.Insert(ea[i]);

            UpdateWeapons(sdt);

            for (int i = 0; i < ea.Count; i++) ea[i].Tick(this, sdt);
            Separate(sdt);
            ContactDamage(sdt);

            var ba = Bullets.Active;
            for (int i = 0; i < ba.Count; i++)
            {
                var b = ba[i];
                b.Tick(this, sdt);
                if (!b.dead && b.delay <= 0f) BulletHits(b);
            }
            Bullets.Sweep();

            var eb = EBullets.Active;
            for (int i = 0; i < eb.Count; i++)
            {
                var b = eb[i];
                b.Tick(this, sdt);
                if (b.dead) continue;
                float rr = b.r + Player.r;
                if (M.Dist2(b.pos, Player.pos) < rr * rr)
                {
                    HurtPlayer(b.dmg);
                    b.dead = true;
                    Fx.Burst(b.pos, 8, b.color, 140f, .3f, 4f);
                }
            }
            EBullets.Sweep();

            var pa = Pickups.Active;
            for (int i = 0; i < pa.Count; i++) pa[i].Tick(this, sdt);
            Pickups.Sweep();

            Enemies.Sweep();

            UpdateZones(sdt);
            Sigils.Update(this, sdt);

            TickTimers(sdt);
            UpdateWave(sdt);

            Fx.Tick(sdt);

            if (PendingLevels > 0 && State == GState.Playing)
            {
                PendingLevels--;
                UIRoot.I.ShowLevelUp();
            }
        }

        // ---- hẹn giờ theo thời gian game ----
        public void After(float sec, Action fn) => timers.Add(new Timer { t = sec, fn = fn });

        void TickTimers(float dt)
        {
            for (int i = timers.Count - 1; i >= 0; i--)
            {
                var t = timers[i];
                t.t -= dt;
                if (t.t <= 0f) { timers.RemoveAt(i); t.fn(); }
                else timers[i] = t;
            }
        }

        // =========================================================
        //  VŨ KHÍ
        // =========================================================
        void UpdateWeapons(float dt)
        {
            for (int i = 0; i < Weapons.Count; i++)
            {
                var w = Weapons[i];
                var def = GameData.Weapons[w.id];

                if (w.id == "blade") { BladeHits(w, def); continue; }
                if (def.Continuous) continue;

                w.t -= dt * Stats.haste;
                if (w.t <= 0f)
                {
                    bool ok = def.Fire(this, w);
                    var st = def.Stat(w.lv);
                    // EvoCd: bản tiến hoá bắn nhanh hơn (<1) hoặc chậm hơn (>1) bản thường
                    float mul = w.evolved ? def.EvoCd : 1f;
                    w.t = ok ? Mathf.Max(.08f, st.cd * mul) : .15f;
                }
            }
        }

        void BladeHits(WeaponInst w, WeaponDef def)
        {
            var st = def.Stat(w.lv);
            var rings = Player.BladeRings(this);

            foreach (var ring in rings)
            {
                for (int i = 0; i < ring.n; i++)
                {
                    float a = ring.ang + i / (float)ring.n * M.TAU;
                    Vector2 bp = Player.pos + M.Dir(a) * ring.rad;
                    grid.Query(bp, ring.hitR + 34f, q);
                    for (int k = 0; k < q.Count; k++)
                    {
                        var e = q[k];
                        if (e.dead || e.spawnT > 0f || e.bladeCd > 0f) continue;
                        float rr = ring.hitR + e.r;
                        if (M.Dist2(bp, e.pos) >= rr * rr) continue;

                        e.bladeCd = .42f;
                        DamageEnemy(e, st.dmg * (w.evolved ? 1.6f : 1f) * Stats.damage, 210f, a, false);
                        Fx.Burst(bp, 4, M.Hex("#8ff6ff"), 175f, .22f, 3.5f);
                        Sfx.Shoot("blade");

                        // THIÊN LUÂN: mỗi nhát chém bắn ra một sóng xung kích nhỏ
                        if (w.evolved)
                        {
                            float R = 34f * Stats.area;
                            Fx.Ring(bp, R, M.Hex("#8ff6ff"), .2f, 2f);
                            foreach (var o in EnemiesInRadius(bp, R))
                                if (o != e) DamageEnemy(o, st.dmg * .18f * Stats.damage, 0f, 0f, true, true);
                        }
                    }
                }
            }
        }

        // =========================================================
        //  API CHO VŨ KHÍ
        // =========================================================
        public BulletSpec Spec() { spec.Reset(); return spec; }

        public void SpawnBullet(BulletSpec s)
        {
            if (Bullets.Count >= 600) return;
            Bullets.Spawn().Setup(s);
        }

        public void SpawnEBullet(Vector2 p, float ang, float spd, float dmg, Color c)
        {
            if (EBullets.Count >= 400) return;
            EBullets.Spawn().Setup(p, ang, spd, dmg, c);
        }

        public Enemy NearestEnemy(Vector2 p, float maxD)
        {
            grid.Query(p, maxD, q);
            Enemy best = null;
            float bd = maxD * maxD;
            for (int i = 0; i < q.Count; i++)
            {
                var e = q[i];
                if (e.dead || e.spawnT > 0f) continue;
                float d = M.Dist2(p, e.pos);
                if (d < bd) { bd = d; best = e; }
            }
            if (best == null && maxD < 1400f)
            {
                float b2 = float.MaxValue;
                var ea = Enemies.Active;
                for (int i = 0; i < ea.Count; i++)
                {
                    var e = ea[i];
                    if (e.dead || e.spawnT > 0f) continue;
                    float d = M.Dist2(p, e.pos);
                    if (d < b2) { b2 = d; best = e; }
                }
            }
            return best;
        }

        public Enemy RandomEnemyNear(Vector2 p, float maxD)
        {
            grid.Query(p, maxD, q2);
            int alive = 0;
            for (int i = 0; i < q2.Count; i++)
                if (!q2[i].dead && q2[i].spawnT <= 0f) q2[alive++] = q2[i];
            if (alive == 0) return NearestEnemy(p, 1200f);
            return q2[UnityEngine.Random.Range(0, alive)];
        }

        /// <summary>
        /// Trả về DANH SÁCH MỚI mỗi lần gọi — bắt buộc, vì một vụ nổ có thể giết quái,
        /// quái đó lại nổ tiếp và gọi đệ quy vào hàm này. Dùng chung một list sẽ hỏng
        /// vòng lặp đang chạy ở tầng ngoài.
        /// </summary>
        public List<Enemy> EnemiesInRadius(Vector2 p, float r)
        {
            var tmp = new List<Enemy>(16);
            grid.Query(p, r, tmp);
            var res = new List<Enemy>(tmp.Count);
            for (int i = 0; i < tmp.Count; i++)
            {
                var e = tmp[i];
                if (e.dead || e.spawnT > 0f) continue;
                float rr = r + e.r;
                if (M.Dist2(p, e.pos) < rr * rr) res.Add(e);
            }
            return res;
        }

        public void Muzzle(Vector2 p, float ang, Color c, float scale)
            => Fx.Burst(p + M.Dir(ang) * 18f, Mathf.RoundToInt(4f * scale) + 3, c, 220f, .2f, 4f * scale, ang, .5f);

        public void FireLaser(Vector2 from, float ang, float len, float width, float dmg)
        {
            Fx.Beam(from, ang, len, width);
            Vector2 d = M.Dir(ang);
            var ea = Enemies.Active;
            for (int i = 0; i < ea.Count; i++)
            {
                var e = ea[i];
                if (e.dead || e.spawnT > 0f) continue;
                Vector2 rel = e.pos - from;
                float t = Vector2.Dot(rel, d);
                if (t < -e.r || t > len) continue;
                Vector2 c = from + d * t;
                float rr = width * .5f + e.r;
                if (M.Dist2(c, e.pos) < rr * rr)
                {
                    DamageEnemy(e, dmg, 90f, ang, false);
                    Fx.Burst(e.pos, 5, M.Hex("#ff88bb"), 190f, .3f, 4f);
                }
            }
            Fx.Flash(Art.Mag, .18f);
        }

        public void ChainLightning(Vector2 from, Enemy first, int chain, float dmg, bool evolved)
        {
            var seen = new HashSet<int>();
            Enemy cur = first;
            Vector2 prev = from;
            for (int i = 0; i < chain && cur != null; i++)
            {
                seen.Add(cur.uid);
                Fx.Arc(prev, cur.pos);
                DamageEnemy(cur, dmg * Mathf.Pow(.88f, i), 40f, 0f, false);
                if (evolved) cur.stunT = Mathf.Max(cur.stunT, .8f);
                Fx.Burst(cur.pos, 7, M.Hex("#c9a8ff"), 210f, .3f, 4f);
                prev = cur.pos;

                grid.Query(prev, 240f, q);
                Enemy best = null;
                float bd = 240f * 240f;
                for (int k = 0; k < q.Count; k++)
                {
                    var e = q[k];
                    if (e.dead || e.spawnT > 0f || seen.Contains(e.uid)) continue;
                    float d = M.Dist2(prev, e.pos);
                    if (d < bd) { bd = d; best = e; }
                }
                cur = best;
            }
            Fx.Flash(Art.Violet, .22f);
        }

        public void FrostNova(Vector2 p, float r, float dmg, float slow, float dur, bool evolved)
        {
            Fx.Shockwave(p, r, Art.Ice);
            var list = EnemiesInRadius(p, r);
            for (int i = 0; i < list.Count; i++)
            {
                var e = list[i];
                DamageEnemy(e, dmg, 60f, 0f, false);
                e.slowAmt = Mathf.Max(e.slowAmt, slow);
                e.slowT = Mathf.Max(e.slowT, dur);
                if (evolved) e.stunT = Mathf.Max(e.stunT, 1.5f);
            }
            for (int i = 0; i < 14; i++)
            {
                float a = M.Rnd(M.TAU);
                Fx.Spark(p + M.Dir(a) * 12f, M.Dir(a) * r * 2.4f, .38f, 5f, M.Hex("#aef3ff"));
            }
        }

        public void AuraPulse(Vector2 p, float r, bool evolved)
        {
            if (M.Chance(.5f))
            {
                float a = M.Rnd(M.TAU);
                Fx.Spark(p + M.Dir(a) * r, -M.Dir(a) * 60f, .45f, 5f, evolved ? M.Hex("#c14dff") : Art.Lime);
            }
        }

        public void Explode(Vector2 p, float r, float dmg, Color c, bool big, int cluster,
                            float craterLife = 0f, float craterDps = 0f)
        {
            Fx.Shockwave(p, r, c);
            Fx.Burst(p, big ? 18 : 8, c, big ? 420f : 280f, .55f, big ? 8f : 5f);
            Fx.Smoke(p, new Color(.16f, .18f, .27f), big ? 4 : 2);
            Sfx.Explode(big);
            Fx.Shake(big ? 7f : 3.5f);
            Fx.Flash(c, big ? .3f : .18f);

            var list = EnemiesInRadius(p, r);
            for (int i = 0; i < list.Count; i++)
            {
                var e = list[i];
                float falloff = 1f - M.Clamp01(Vector2.Distance(p, e.pos) / r) * .45f;
                DamageEnemy(e, dmg * falloff, 300f, M.Ang(p, e.pos), false);
            }

            if (craterLife > 0f)
                AddZone(p, r * .8f, craterLife, craterDps, c, 0f, false, 26f);

            for (int i = 0; i < cluster; i++)
            {
                float a = M.Rnd(M.TAU), d = M.Rnd(50f, r * .9f);
                Vector2 cp = p + M.Dir(a) * d;
                After(.12f + i * .09f, () => Explode(cp, r * .5f, dmg * .45f, c, false, 0));
            }
        }

        // =========================================================
        //  VÙNG HIỆU ỨNG + KỸ NĂNG CỦA VŨ KHÍ TIẾN HOÁ
        // =========================================================
        public Zone AddZone(Vector2 p, float r, float life, float dps, Color color,
                            float slow = 0f, bool follow = false, float fx = 12f)
        {
            if (Zones.Count > 60) Zones.RemoveAt(0);
            var z = new Zone
            {
                p = p, r = r, life = life, maxLife = life,
                dps = dps, color = color, slow = slow, follow = follow, fx = fx
            };
            Zones.Add(z);
            return z;
        }

        void UpdateZones(float dt)
        {
            for (int i = Zones.Count - 1; i >= 0; i--)
            {
                var z = Zones[i];
                z.life -= dt;
                if (z.life <= 0f) { Zones.RemoveAt(i); continue; }
                if (z.follow) z.p = Player.pos;

                z.dmgT -= dt;
                if (z.dmgT <= 0f)
                {
                    z.dmgT = .25f;
                    foreach (var e in EnemiesInRadius(z.p, z.r))
                    {
                        DamageEnemy(e, z.dps * .25f, 0f, 0f, true, true);
                        if (z.slow > 0f)
                        {
                            e.slowAmt = Mathf.Max(e.slowAmt, z.slow);
                            e.slowT = Mathf.Max(e.slowT, .8f);
                        }
                    }
                }

                if (M.Chance(dt * z.fx))
                {
                    float a = M.Rnd(M.TAU), rr = Mathf.Sqrt(UnityEngine.Random.value) * z.r;
                    Fx.Spark(z.p + M.Dir(a) * rr, new Vector2(M.Rnd(-18f, 18f), M.Rnd(14f, 52f)),
                             .5f, 5f, z.color);
                }
            }
        }

        /// <summary>LÔI VŨ — gọi n tia sét từ trời, mỗi chỗ để lại một vũng điện.</summary>
        public void ThunderRain(int n, float dmg, float zoneDps)
        {
            float A = Stats.area;
            for (int i = 0; i < n; i++)
            {
                After(i * .06f, () =>
                {
                    var tgt = RandomEnemyNear(Player.pos, 640f);
                    Vector2 at = tgt != null
                        ? tgt.pos + new Vector2(M.Rnd(-40f, 40f), M.Rnd(-40f, 40f))
                        : Player.pos + new Vector2(M.Rnd(-420f, 420f), M.Rnd(-420f, 420f));

                    Fx.Arc(at + new Vector2(M.Rnd(-40f, 40f), 900f), at, M.Hex("#ffe23c"));
                    Fx.Ring(at, 70f * A, M.Hex("#ffe23c"), .28f, 2f);
                    foreach (var e in EnemiesInRadius(at, 70f * A))
                        DamageEnemy(e, dmg, 140f, M.Ang(at, e.pos), false, false);
                    // fx thấp: 20 vũng cùng lúc sẽ ngốn hết kho hạt nếu để cao
                    AddZone(at, 62f * A, 2f, zoneDps, M.Hex("#ffe23c"), 0f, false, 4f);
                });
            }
            // rung MỘT lần cho cả loạt, không rung theo từng tia (rất giật)
            Fx.Shake(2f);
            Fx.Flash(M.Hex("#ffe23c"), .15f);
        }

        /// <summary>LĂNG KÍNH — tia laser nảy giữa các kẻ địch, đổi màu cầu vồng mỗi lần nảy.</summary>
        public void PrismBeam(Enemy first, int bounces, float dmg, float w)
        {
            Color[] cols = {
                M.Hex("#ff2e88"), M.Hex("#ff8a3c"), M.Hex("#ffe23c"),
                M.Hex("#b6ff3a"), M.Hex("#25f4ee"), M.Hex("#9d6bff"), M.Hex("#ff5ecf")
            };
            var seen = new HashSet<int>();
            Vector2 from = Player.pos;
            Enemy cur = first;

            for (int i = 0; i <= bounces && cur != null; i++)
            {
                seen.Add(cur.uid);
                float a = M.Ang(from, cur.pos);
                float len = Vector2.Distance(from, cur.pos) + 60f;
                Color col = cols[i % cols.Length];
                Fx.Beam(from, a, len, w, col);

                Vector2 d = M.Dir(a);
                foreach (var e in Enemies.Active)
                {
                    if (e.dead || e.spawnT > 0f) continue;
                    Vector2 rel = e.pos - from;
                    float t = Vector2.Dot(rel, d);
                    if (t < -e.r || t > len) continue;
                    Vector2 c = from + d * t;
                    float rr = w * .5f + e.r;
                    if (M.Dist2(c, e.pos) < rr * rr)
                    {
                        DamageEnemy(e, dmg, 70f, a, false, false);
                        Fx.Burst(e.pos, 5, col, 200f, .3f, 4f);
                    }
                }

                from = cur.pos;
                Enemy best = null;
                float bd = 460f * 460f;
                foreach (var e in EnemiesInRadius(from, 460f))
                {
                    if (seen.Contains(e.uid)) continue;
                    float dd = M.Dist2(from, e.pos);
                    if (dd < bd) { bd = dd; best = e; }
                }
                cur = best;
            }
            Fx.Flash(Color.white, .12f);
            Fx.Shake(1.2f);
        }

        public void SlowMo(float seconds) => slowmoT = Mathf.Max(slowmoT, seconds);

        /// <summary>
        /// Vụ nổ nhỏ KHÔNG rung màn hình — dùng cho chuỗi nổ dọc đường của Pháo Hạm.
        /// Nếu dùng Explode() thường, hàng chục vụ nổ liên tiếp sẽ rung không dứt.
        /// </summary>
        public void MiniBoom(Vector2 p, float r, float dmg, Color c)
        {
            Fx.Ring(p, r, c, .28f, 3f);
            Fx.Burst(p, 6, c, 240f, .4f, 5f);
            foreach (var e in EnemiesInRadius(p, r))
            {
                float falloff = 1f - M.Clamp01(Vector2.Distance(p, e.pos) / r) * .45f;
                DamageEnemy(e, dmg * falloff, 160f, M.Ang(p, e.pos), false);
            }
        }

        public void BulletExpire(Bullet b)
        {
            b.dead = true;
            if (b.hasAoe) Explode(b.pos, b.aoeR, b.aoeDmg, b.aoeColor, b.aoeBig, b.aoeCluster, b.aoeCraterLife, b.aoeCraterDps);
        }

        void BulletHits(Bullet b)
        {
            grid.Query(b.pos, b.radius + 40f, q);
            for (int i = 0; i < q.Count; i++)
            {
                var e = q[i];
                if (e.dead || e.spawnT > 0f) continue;
                if (b.hits.TryGetValue(e.uid, out float last))
                {
                    if (b.hitCd <= 0f || Time_ - last < b.hitCd) continue;
                }
                float rr = b.radius + e.r;
                if (M.Dist2(b.pos, e.pos) >= rr * rr) continue;

                b.hits[e.uid] = Time_;
                bool wasAlive = !e.dead;
                DamageEnemy(e, b.dmg, b.knock, b.ang, false);

                // ĐẠN PHÂN LIỆT: viên nào hạ gục thì tách thành 2 viên con tự truy đuổi
                if (b.split > 0 && wasAlive && e.dead)
                {
                    for (int k = 0; k < 2; k++)
                    {
                        var s = Spec();
                        s.pos = e.pos; s.ang = M.Rnd(M.TAU); s.spd = 380f;
                        s.dmg = b.dmg * .55f;
                        s.sprite = "b_basic"; s.color = M.Hex("#8ff6ff");
                        s.radius = b.radius * .85f; s.life = 1.6f;
                        s.homing = 6f; s.accel = 520f; s.maxSpd = 720f;
                        s.scale = b.scale; s.split = b.split - 1; s.knock = 40f;
                        SpawnBullet(s);
                    }
                    Fx.Burst(e.pos, 9, M.Hex("#8ff6ff"), 240f, .32f, 4f);
                }

                // LƯỠI HÁI: chém trúng thì to và mạnh thêm
                if (b.grow > 0f && b.growN < b.growCap)
                {
                    b.growN++;
                    b.radius *= 1f + b.grow;
                    b.dmg *= 1f + b.grow;
                    b.spd *= 1.04f;
                    Fx.Ring(b.pos, b.radius * 1.6f, b.color, .2f, 2f);
                }
                if (b.slow > 0f) { e.slowAmt = Mathf.Max(e.slowAmt, b.slow); e.slowT = Mathf.Max(e.slowT, 1.5f); }
                Fx.Burst(b.pos, 3, b.color, 190f, .22f, 3.5f, b.ang + Mathf.PI, 1.1f);

                if (b.hasAoe) { Explode(b.pos, b.aoeR, b.aoeDmg, b.aoeColor, b.aoeBig, b.aoeCluster, b.aoeCraterLife, b.aoeCraterDps); b.dead = true; return; }
                if (b.pierce > 0) b.pierce--;
                else if (!b.boomerang) { b.dead = true; return; }
            }
        }

        // =========================================================
        //  SÁT THƯƠNG
        // =========================================================
        /// <param name="fromSigil">
        /// Sát thương do chính Ấn Ký / vùng hiệu ứng gây ra — không kích hoạt lại hook,
        /// nếu không sẽ đệ quy vô hạn.
        /// </param>
        public void DamageEnemy(Enemy e, float dmg, float knock, float ang, bool silent,
                                bool fromSigil = false)
        {
            if (e.dead) return;

            dmg *= Sigils.DmgMul(this, e);
            bool crit = M.Chance(Stats.crit);
            if (crit) dmg *= Stats.critDmg;
            dmg = Mathf.Max(1f, dmg);

            // chỉ tính phần sát thương THỰC SỰ ăn vào, không tính phần thừa
            DmgDealt += Mathf.Min(dmg, Mathf.Max(0f, e.hp));
            e.hp -= dmg;
            e.flash = .22f;

            // KHÁT MÁU (luật của HUYẾT NHÃN): vô hiệu hoá hút máu suốt trận trùm
            if (Stats.lifesteal > 0f && BossRule != "bloodthirst" && Player.hp < Player.maxHp)
            {
                Player.hp = Mathf.Min(Player.maxHp, Player.hp + dmg * Stats.lifesteal);
                if (M.Chance(.12f)) Fx.Spark(Player.pos, new Vector2(M.Rnd(-20f, 20f), 50f), .5f, 4f, Art.Mag);
            }

            if (knock > 0f && !e.boss)
            {
                float kn = knock * (1f - e.knockRes);
                float a = ang != 0f ? ang : M.Ang(Player.pos, e.pos);
                e.vel += M.Dir(a) * kn;
            }

            if (!silent)
            {
                if (dmgBudget > 0)
                {
                    dmgBudget--;
                    Fx.Text(e.pos + new Vector2(M.Rnd(-8f, 8f), e.r + 6f),
                            crit ? "✦" + Mathf.Round(dmg) : Mathf.Round(dmg).ToString(),
                            crit ? M.Hex("#ffe23c") : Color.white,
                            crit ? 21f : 15f);
                }
                Sfx.Hit(crit);
            }

            if (crit)
            {
                Fx.Burst(e.pos, 8, M.Hex("#ffe23c"), 260f, .35f, 5f);
                Fx.Shake(1.6f);
            }

            if (!fromSigil) Sigils.OnHit(this, e);
            if (e.hp <= 0f) { KillEnemy(e); return; }
            if (!fromSigil) Sigils.AfterHit(this, e);
        }

        void KillEnemy(Enemy e)
        {
            if (e.dead) return;
            e.dead = true;
            Kills++;
            Sigils.OnKill(this, e);

            Fx.Burst(e.pos, e.boss ? 60 : 12, e.color, e.boss ? 520f : 260f, .6f, e.boss ? 9f : 5f);
            Fx.Ring(e.pos, e.r * (e.boss ? 6f : 2.4f), e.color, .4f, e.boss ? 8f : 3f);

            if (e.boss)
            {
                Sfx.BossDie();
                Fx.Shake(24f);
                Fx.Flash(Color.white, .8f);
                slowmoT = 1.4f;
                Boss = null;
                ClearBossRule();          // gỡ luật ngay, đừng để dính sang màn sau
                UIRoot.I.HideBossBar();
                UIRoot.I.Announce("HẠ GỤC!", Art.Gold);

                for (int i = 0; i < 3; i++)
                    SpawnPickup(e.pos + M.Dir(M.Rnd(M.TAU)) * 40f, PickKind.Chest, 1f);
                for (int i = 0; i < 26; i++)
                    SpawnPickup(e.pos + M.Dir(M.Rnd(M.TAU)) * M.Rnd(20f, 130f), PickKind.Xp, Mathf.Ceil(e.xp / 12f));
                for (int i = 0; i < 8; i++)
                    SpawnPickup(e.pos + M.Dir(M.Rnd(M.TAU)) * M.Rnd(20f, 110f), PickKind.Coin, 10f);

                waveClearing = true;
                After(1.5f, EndWave);
                return;
            }

            Sfx.Kill();

            if (e.def.DeathBomb > 0f)
                Explode(e.pos, 82f, e.def.DeathBomb * (1f + Wave * .1f), M.Hex("#ff5ecf"), false, 0);

            if (e.split > 0 && e.type != "_split")
            {
                for (int i = 0; i < e.split; i++)
                {
                    var c = SpawnEnemy("swarm", e.pos + M.Dir(M.Rnd(M.TAU)) * 22f, false);
                    if (c != null) c.type = "_split";
                }
            }

            /* TÁCH BẦY (luật của TRÙNG MẪU): quái thường chết đều đẻ ra 2 con swarm.
               Con đẻ ra được đánh dấu "_split" nên KHÔNG đẻ tiếp — nếu không thì
               một cú nổ diện rộng sẽ thành phản ứng dây chuyền hàm mũ, treo máy. */
            if (BossRule == "hive" && e.type != "_split" && Enemies.Active.Count < 240)
            {
                for (int i = 0; i < 2; i++)
                {
                    var c = SpawnEnemy("swarm", e.pos + M.Dir(M.Rnd(M.TAU)) * 20f, false);
                    if (c != null) c.type = "_split";
                }
                Fx.Burst(e.pos, 6, Art.Mag, 180f, .3f, 4f);
            }

            SpawnPickup(e.pos, PickKind.Xp, Mathf.Max(1f, Mathf.Round(e.xp * (e.elite ? 4f : 1f))));

            float luck = UnityEngine.Random.value;
            if (e.elite)
            {
                SpawnPickup(e.pos + new Vector2(M.Rnd(-14f, 14f), M.Rnd(-14f, 14f)), PickKind.Coin, 8f);
                if (luck < .35f) SpawnPickup(e.pos, PickKind.Heart, 22f);
            }
            else
            {
                if (luck < .022f) SpawnPickup(e.pos, PickKind.Heart, 14f);
                else if (luck < .055f) SpawnPickup(e.pos, PickKind.Coin, 3f);
                else if (luck < .062f) SpawnPickup(e.pos, PickKind.Magnet, 1f);
                else if (luck < .066f) SpawnPickup(e.pos, PickKind.Nuke, 1f);
            }
        }

        public void HurtPlayer(float dmg)
        {
            if (State != GState.Playing || Player.iframe > 0f) return;

            if (M.Chance(Stats.dodge))
            {
                Fx.Text(Player.pos + new Vector2(0, 24f), "NÉ!", M.Hex("#8fa8ff"), 16f);
                Sfx.Play("dodge", .5f);
                Player.iframe = .25f;
                return;
            }

            // sát thương của quái đã được nhân theo màn lúc sinh ra — không nhân lần nữa
            float real = Mathf.Max(dmg * .15f, dmg - Stats.armor, 1f);
            Player.hp -= real;
            Player.iframe = .55f;

            Fx.Text(Player.pos + new Vector2(0, 26f), "-" + Mathf.Round(real), Art.Red, 19f);
            Fx.Burst(Player.pos, 14, Art.Red, 260f, .4f, 5f);
            Fx.Shake(8f);
            Fx.Flash(M.Hex("#ff2e4d"), .32f);
            UIRoot.I.HurtFlash();
            Sfx.Play("hurt", .8f);

            // Ấn Phượng Hoàng tầng 4 có thể cứu một mạng
            if (Player.hp <= 0f && !Sigils.OnLethal(this)) { Player.hp = 0f; Die(); }
        }

        void ContactDamage(float dt)
        {
            grid.Query(Player.pos, 90f, q);
            for (int i = 0; i < q.Count; i++)
            {
                var e = q[i];
                if (e.dead || e.spawnT > 0f) continue;
                float rr = e.r + Player.r;
                if (M.Dist2(e.pos, Player.pos) >= rr * rr) continue;

                if (e.hitCd <= 0f) { HurtPlayer(e.dmg); e.hitCd = .6f; }
                if (!e.boss)
                {
                    float a = M.Ang(Player.pos, e.pos);
                    e.vel += M.Dir(a) * 220f * dt * 8f;
                }
            }
        }

        void Separate(float dt)
        {
            var a = Enemies.Active;
            for (int i = 0; i < a.Count; i++)
            {
                var e = a[i];
                if (e.boss) continue;
                grid.Query(e.pos, e.r * 2.1f, q);
                int n = 0;
                for (int j = 0; j < q.Count && n < 5; j++)
                {
                    var o = q[j];
                    if (o == e || o.dead) continue;
                    Vector2 d = e.pos - o.pos;
                    float rr = e.r + o.r;
                    float d2 = d.sqrMagnitude;
                    if (d2 > .001f && d2 < rr * rr)
                    {
                        float dist = Mathf.Sqrt(d2);
                        float f = (rr - dist) / rr * 240f;
                        e.vel += d / dist * f * dt * 8f;
                        n++;
                    }
                }
            }
        }

        // =========================================================
        //  VẬT PHẨM
        // =========================================================
        public void SpawnPickup(Vector2 p, PickKind k, float v)
        {
            if (Pickups.Count >= 900) return;
            Pickups.Spawn().Setup(p, k, v);
        }

        public void Collect(Pickup o)
        {
            switch (o.kind)
            {
                case PickKind.Xp:
                    Player.xp += o.value * Stats.xpGain;
                    Sfx.Pickup();
                    while (Player.xp >= Player.xpNext)
                    {
                        Player.xp -= Player.xpNext;
                        Player.level++;
                        Player.xpNext = Mathf.RoundToInt(5f + Player.level * 4f + Mathf.Pow(Player.level, 1.62f));
                        PendingLevels++;
                    }
                    break;

                case PickKind.Coin:
                    Gold += Mathf.RoundToInt(o.value);
                    Sfx.Play("coin", .5f, M.Rnd(.95f, 1.08f), 40f);
                    Fx.Text(o.pos, "+" + Mathf.RoundToInt(o.value), Art.Gold, 14f);
                    break;

                case PickKind.Heart:
                    {
                        float h = Mathf.Min(o.value, Player.maxHp - Player.hp);
                        Player.hp = Mathf.Min(Player.maxHp, Player.hp + o.value);
                        Sfx.Play("heal", .7f);
                        Fx.Text(Player.pos + new Vector2(0, 28f), "+" + Mathf.Round(h), M.Hex("#3affa0"), 18f);
                        Fx.Burst(Player.pos, 12, M.Hex("#3affa0"), 160f, .5f, 5f);
                        break;
                    }

                case PickKind.Magnet:
                    foreach (var q3 in Pickups.Active) if (q3.kind == PickKind.Xp) q3.magnetized = true;
                    Sfx.Play("chest", .8f);
                    UIRoot.I.Announce("HÚT TOÀN BẢN ĐỒ", M.Hex("#4de1ff"));
                    Fx.Ring(Player.pos, 500f, M.Hex("#4de1ff"), .7f, 6f);
                    break;

                case PickKind.Nuke:
                    {
                        Fx.Shake(20f); Fx.Flash(Color.white, .9f);
                        Sfx.Explode(true);
                        slowmoT = .5f;
                        var snapshot = new List<Enemy>(Enemies.Active);
                        foreach (var e in snapshot)
                        {
                            if (e.dead) continue;
                            if (e.boss) { DamageEnemy(e, 400f * Stats.damage, 0f, 0f, false); continue; }
                            Fx.Burst(e.pos, 8, e.color, 220f, .4f, 5f);
                            KillEnemy(e);
                        }
                        UIRoot.I.Announce("THANH TẨY!", M.Hex("#ffe23c"));
                        break;
                    }

                case PickKind.Chest:
                    Sfx.Play("chest", .9f);
                    PendingLevels += 2;
                    Gold += 40;
                    UIRoot.I.Announce("RƯƠNG BÁU!", Art.Gold);
                    Fx.Burst(o.pos, 40, Art.Gold, 320f, .8f, 6f);
                    break;
            }
        }

        // =========================================================
        //  MÀN CHƠI
        // =========================================================
        void UpdateWave(float dt)
        {
            if (waveClearing) return;

            if (Boss != null)
            {
                if (Boss.dead) { Boss = null; ClearBossRule(); }
                else { UIRoot.I.UpdateBossBar(Boss.hp / Boss.maxHp); TickBossRule(dt); }

                spawnT -= dt;
                if (spawnT <= 0f)
                {
                    spawnT = 1.5f;
                    if (Enemies.Count < 90) SpawnWaveEnemy();
                }
                return;
            }

            WaveTime -= dt;

            spawnT -= dt;
            if (spawnT <= 0f)
            {
                spawnT = Mathf.Max(.13f, .70f - Wave * .035f);
                int batch = 1 + Wave / 3;
                int cap = Mathf.Min(260, 60 + Wave * 14);
                for (int i = 0; i < batch && Enemies.Count < cap; i++) SpawnWaveEnemy();
            }

            if (WaveTime <= 0f)
            {
                if (Wave % 5 == 0) StartBoss();
                else EndWave();
            }
        }

        void SpawnWaveEnemy()
        {
            float total = 0f;
            for (int i = 0; i < GameData.SpawnTable.Length; i++)
                if (Wave >= GameData.SpawnTable[i].from) total += GameData.SpawnTable[i].w;
            float r = M.Rnd(total);
            string id = "grunt";
            for (int i = 0; i < GameData.SpawnTable.Length; i++)
            {
                var row = GameData.SpawnTable[i];
                if (Wave < row.from) continue;
                r -= row.w;
                if (r <= 0f) { id = row.id; break; }
            }
            bool elite = M.Chance(Mathf.Min(.16f, .012f + Wave * .008f));
            SpawnEnemy(id, EdgeSpawnPos(), elite);
        }

        /// <summary>Điểm sinh ngay ngoài rìa màn hình để quái vào trận nhanh.</summary>
        Vector2 EdgeSpawnPos()
        {
            float hh = Cam.orthographicSize + M.Rnd(40f, 110f);
            float hw = Cam.orthographicSize * Cam.aspect + M.Rnd(40f, 110f);
            Vector2 p = Player.pos;
            float x, y;
            if (M.Chance(hw / (hw + hh))) { x = p.x + M.Rnd(-hw, hw); y = p.y + (M.Chance(.5f) ? -hh : hh); }
            else { x = p.x + (M.Chance(.5f) ? -hw : hw); y = p.y + M.Rnd(-hh, hh); }
            float B = Arena - 40f;
            return new Vector2(Mathf.Clamp(x, -B, B), Mathf.Clamp(y, -B, B));
        }

        public Enemy SpawnEnemy(string id, Vector2 p, bool elite)
        {
            if (Enemies.Count > 300) return null;
            if (!GameData.Enemies.TryGetValue(id, out var def)) return null;

            float hpMul = 1f + (Wave - 1) * .30f + Mathf.Pow(Wave, 1.75f) * .014f;
            float dmgMul = 1f + (Wave - 1) * .11f;
            float spdMul = Mathf.Min(1.55f, 1f + (Wave - 1) * .014f) * (elite ? .88f : 1f);

            var e = Enemies.Spawn();
            e.Setup(def, id, p, def.Hp * hpMul * (elite ? 5f : 1f), def.Dmg * dmgMul, def.Xp,
                    elite, false, null, elite ? 1.45f : 1f, spdMul);
            return e;
        }

        /* Bật luật đấu trường của trùm. Gọi đúng 1 lần lúc trùm xuất hiện. */
        void ApplyBossRule(string id)
        {
            BossRule = id;
            EclipseT = 0f;
            if (id == null || !GameData.BossRules.TryGetValue(id, out var r)) return;
            UIRoot.I.ShowBossRule(r);
            // báo luật SAU tên trùm 1 nhịp để người chơi kịp đọc, dùng đồng hồ
            // theo thời gian game (không phải coroutine thời gian thực) nên tạm dừng là dừng theo.
            After(1.15f, () =>
            {
                if (BossRule == id) { UIRoot.I.Announce(r.Name, r.Color); Fx.Flash(r.Color, .45f); }
            });
        }

        /* Các luật cần chạy mỗi khung hình. Chỉ gọi khi trùm còn sống. */
        void TickBossRule(float dt)
        {
            if (BossRule == "eclipse")
            {
                // NHẬT THỰC: bóng tối khép lại trong 2,5 giây đầu rồi giữ nguyên
                EclipseT = Mathf.Min(1f, EclipseT + dt / 2.5f);
                if (eclipseSr != null && Player != null)
                {
                    if (!eclipseSr.gameObject.activeSelf) eclipseSr.gameObject.SetActive(true);
                    eclipseSr.transform.position = new Vector3(Player.pos.x, Player.pos.y, 0f);
                    eclipseSr.color = new Color(1, 1, 1, EclipseT * .93f);
                }
            }
            else if (BossRule == "collapse")
            {
                // THU HẸP: đấu trường co dần, nhưng CHẶN ở 42% để còn chỗ né đạn.
                // Nếu để co về 0 thì không phải khó, mà là không thể thắng.
                float floorR = ArenaFull * .42f;
                if (Arena > floorR) SetArena(Mathf.Max(floorR, Arena - 46f * dt));
            }
        }

        /* Gỡ luật + trả đấu trường về kích thước gốc. */
        public void ClearBossRule()
        {
            BossRule = null;
            EclipseT = 0f;
            SetArena(ArenaFull);
            if (eclipseSr != null) eclipseSr.gameObject.SetActive(false);
            if (UIRoot.I != null) UIRoot.I.HideBossRule();
        }

        /* Đổi kích thước đấu trường. Lưới nền / quầng sáng / viền được dựng MỘT LẦN
           lúc khởi động theo Arena, nên đổi số thôi là chưa đủ — phải vẽ lại cả ba,
           không thì người chơi bị chặn ở bức tường vô hình cách xa viền đang thấy. */
        void SetArena(float a)
        {
            if (Mathf.Approximately(Arena, a)) return;
            Arena = a;
            if (gridQuad != null) gridQuad.localScale = new Vector3(a * 2f, a * 2f, 1f);
            // ô lưới phải giữ nguyên 80 đơn vị, không thì lưới bị kéo giãn theo
            if (gridMat != null) gridMat.mainTextureScale = new Vector2(a * 2f / 80f, a * 2f / 80f);
            if (centerGlow != null) centerGlow.transform.localScale = Vector3.one * (a * 2f / 128f);
            if (border != null)
            {
                border.SetPosition(0, new Vector3(-a, -a, 0));
                border.SetPosition(1, new Vector3(a, -a, 0));
                border.SetPosition(2, new Vector3(a, a, 0));
                border.SetPosition(3, new Vector3(-a, a, 0));
            }
        }

        void StartBoss()
        {
            // QUAY VÒNG chứ không kẹp ở con cuối — hết 8 con thì quay lại con đầu,
            // độ khó về sau do `tier` bên dưới lo.
            int idx = (Wave / 5 - 1) % GameData.Bosses.Length;
            if (idx < 0) idx = 0;
            var bd = GameData.Bosses[idx];
            int tier = (Wave - 1) / 15;
            float hp = bd.Hp * (1f + tier * 2.4f) * (1f + (Wave - 5) * .12f);

            var def = new EnemyDef
            {
                Id = "boss", Sprite = bd.Sprite, R = bd.R, Hp = bd.Hp,
                Spd = bd.Spd, Dmg = bd.Dmg, Xp = bd.Xp, Color = bd.Color, Ai = "boss"
            };

            var e = Enemies.Spawn();
            e.Setup(def, "boss", EdgeSpawnPos(), hp, bd.Dmg * (1f + Wave * .06f), bd.Xp,
                    false, true, bd, 1f, 1f);
            Boss = e;

            UIRoot.I.ShowBossBar(bd.Name);
            ApplyBossRule(bd.Rule);          // sau ShowBossBar: huy hiệu luật là con của thanh máu trùm
            UIRoot.I.Announce(bd.Name, bd.Color);
            Sfx.Play("bossWarn", 1f);
            Fx.Shake(16f);
            Sfx.SetIntensity(1f);
        }

        void EndWave()
        {
            waveClearing = true;

            var snapshot = new List<Enemy>(Enemies.Active);
            foreach (var e in snapshot)
            {
                if (e.dead) continue;
                Fx.Burst(e.pos, 8, e.color, 200f, .4f, 4f);
                SpawnPickup(e.pos, PickKind.Xp, 1f);
                e.dead = true;
            }
            EBullets.Clear();

            Sfx.Play("waveClear", .8f);
            UIRoot.I.Announce("HOÀN THÀNH MÀN " + Wave, Art.Lime);

            Player.hp = Mathf.Min(Player.maxHp, Player.hp + Player.maxHp * .18f);

            Wave++;
            if (Wave - 1 > SaveData.Best) SaveData.Best = Wave - 1;

            After(1.4f, () =>
            {
                PendingLevels++;
                WaveDur = Mathf.Min(46f, 30f + Wave);
                WaveTime = WaveDur;
                waveClearing = false;
                spawnT = .4f;
                Sfx.SetIntensity(M.Clamp01(.15f + Wave * .055f));
                UIRoot.I.Announce("MÀN " + Wave, Art.Cyan);
                Sfx.Play("waveStart", .7f);
            });
        }

        void Die()
        {
            State = GState.Dead;
            ClearBossRule();          // chết giữa trận trùm cũng phải gỡ luật, đừng để
            UIRoot.I.HideBossBar();   // huy hiệu treo lại trên màn hình kết thúc
            slowmoT = 0f; slowmo = 1f;
            Fx.Shake(20f);
            Fx.Flash(M.Hex("#ff2e4d"), 1f);
            Fx.Burst(Player.pos, 60, Player.ch.Color, 460f, 1f, 8f);
            Sfx.Play("gameOver", .9f);
            Sfx.StopMusic();

            SaveData.Runs = SaveData.Runs + 1;
            if (Kills > SaveData.BestKills) SaveData.BestKills = Kills;
            if (Wave - 1 > SaveData.Best) SaveData.Best = Wave - 1;

            UIRoot.I.ShowGameOverDelayed();
        }

        // =========================================================
        //  NÂNG CẤP
        // =========================================================
        public List<Offer> BuildOffers(int n)
        {
            var outList = new List<Offer>(4);
            var pool = new List<Offer>(32);

            // tiến hoá được ưu tiên
            foreach (var w in Weapons)
            {
                var def = GameData.Weapons[w.id];
                if (w.evolved || w.lv < def.Max) continue;
                var pas = Passives.Find(p => p.id == def.PairId);
                if (pas != null && pas.lv >= 3)
                    outList.Add(new Offer { Kind = "evo", Id = w.id });
            }

            foreach (var w in Weapons)
            {
                var def = GameData.Weapons[w.id];
                if (w.lv < def.Max) pool.Add(new Offer { Kind = "wup", Id = w.id, Lv = w.lv + 1, W = 10f });
            }

            if (Weapons.Count < 6)
                foreach (var id in GameData.WeaponIds)
                    if (Weapons.Find(w => w.id == id) == null)
                        pool.Add(new Offer { Kind = "wnew", Id = id, Lv = 1, W = 7f });

            foreach (var id in GameData.PassiveIds)
            {
                var def = GameData.Passives[id];
                var have = Passives.Find(p => p.id == id);
                if (have != null && have.lv >= def.Max) continue;
                if (have == null && Passives.Count >= 6) continue;
                pool.Add(new Offer { Kind = "pas", Id = id, Lv = have != null ? have.lv + 1 : 1, W = have != null ? 9f : 6f });
            }

            // ẤN KÝ — tầng cuối chỉ hiện ra khi đã đủ chỉ số điều kiện
            foreach (var id in Sigils.Ids)
            {
                var def = Sigils.All[id];
                var have = SigilList.Find(s => s.id == id);
                if (have == null)
                {
                    if (SigilList.Count >= 3) continue;
                    pool.Add(new Offer { Kind = "sig", Id = id, Lv = 1, W = 5f });
                    continue;
                }
                if (have.lv >= def.Max) continue;
                int next = have.lv + 1;
                if (next == def.Max && !Sigils.ReqMet(this, def)) continue;   // chưa đủ chỉ số -> khoá
                pool.Add(new Offer { Kind = "sig", Id = id, Lv = next, W = next == def.Max ? 16f : 8f });
            }

            M.Shuffle(pool);
            while (outList.Count < n && pool.Count > 0)
            {
                float total = 0f;
                foreach (var o in pool) total += o.W;
                float r = M.Rnd(total);
                int idx = pool.Count - 1;
                for (int i = 0; i < pool.Count; i++) { r -= pool[i].W; if (r <= 0f) { idx = i; break; } }
                outList.Add(pool[idx]);
                pool.RemoveAt(idx);
            }

            if (outList.Count == 0) outList.Add(new Offer { Kind = "heal" });
            return outList;
        }

        public void ApplyOffer(Offer o)
        {
            switch (o.Kind)
            {
                case "evo":
                    {
                        var w = Weapons.Find(x => x.id == o.Id);
                        if (w != null) w.evolved = true;
                        UIRoot.I.Announce("TIẾN HOÁ!", Art.Gold);
                        Fx.Flash(Art.Gold, .7f);
                        Fx.Burst(Player.pos, 50, Art.Gold, 400f, .9f, 7f);
                        break;
                    }
                case "wup":
                    {
                        var w = Weapons.Find(x => x.id == o.Id);
                        if (w != null) w.lv++;
                        break;
                    }
                case "wnew":
                    Weapons.Add(new WeaponInst { id = o.Id, lv = 1 });
                    break;
                case "pas":
                    {
                        var p = Passives.Find(x => x.id == o.Id);
                        if (p != null) p.lv++;
                        else Passives.Add(new PassiveInst { id = o.Id, lv = 1 });
                        Recalc(false);
                        break;
                    }
                case "sig":
                    {
                        var s = SigilList.Find(x => x.id == o.Id);
                        if (s != null) s.lv++;
                        else SigilList.Add(new SigilInst { id = o.Id, lv = 1, n = 0, t = 3f, used = false });
                        Recalc(false);
                        var def = Sigils.All[o.Id];
                        if (o.Lv == def.Max)          // tầng cuối: làm cho hoành tráng
                        {
                            UIRoot.I.Announce("THỨC TỈNH!", Art.Gold);
                            Fx.Flash(def.Color, .85f);
                            Fx.Shake(10f);
                            Fx.Shockwave(Player.pos, 380f, def.Color);
                            Fx.Burst(Player.pos, 60, def.Color, 420f, 1f, 8f);
                            Sfx.Play("chest", .9f);
                        }
                        break;
                    }
                case "heal":
                    Player.hp = Mathf.Min(Player.maxHp, Player.hp + Player.maxHp * .4f);
                    break;
            }
            Fx.Burst(Player.pos, 24, Color.white, 300f, .6f, 5f);
            Fx.Shake(4f);
            UIRoot.I.RefreshLoadout();
        }

        // =========================================================
        //  CAMERA & VẼ
        // =========================================================
        void UpdateCamera(float dt)
        {
            if (State != GState.Menu && Player != null)
                camPos = M.Damp(camPos, Player.pos + Player.vel * .12f, .0015f, dt);

            camTr.position = new Vector3(camPos.x + Fx.ShakeOffX, camPos.y + Fx.ShakeOffY, -10f);
        }

        void RenderAll()
        {
            var ea = Enemies.Active;
            for (int i = 0; i < ea.Count; i++) ea[i].Render(this);

            var ba = Bullets.Active;
            for (int i = 0; i < ba.Count; i++) ba[i].Render();

            var eb = EBullets.Active;
            for (int i = 0; i < eb.Count; i++) eb[i].Render();

            var pa = Pickups.Active;
            for (int i = 0; i < pa.Count; i++) pa[i].Render();

            // vòng hào quang
            var aw = Player != null ? FindWeapon("aura") : null;
            if (aw != null)
            {
                var st = GameData.Weapons["aura"].Stat(aw.lv);
                float R = st.radius * Stats.area * (aw.evolved ? 1.35f : 1f);
                var c = aw.evolved ? M.Hex("#c14dff") : Art.Lime;
                auraRing.gameObject.SetActive(true);
                auraRing.transform.position = new Vector3(Player.pos.x, Player.pos.y, 0f);
                auraRing.transform.localScale = Vector3.one * (R * 2f / 128f);
                auraRing.color = new Color(c.r, c.g, c.b, .18f + Mathf.Sin(Time_ * 5f) * .05f);
            }
            else if (auraRing.gameObject.activeSelf) auraRing.gameObject.SetActive(false);

            RenderZones();
            RenderHoles();
            RenderCursor();
        }

        SpriteRenderer cursorRing;

        /// <summary>Vòng ngắm hiện ở đích khi đang lái bằng chuột.</summary>
        void RenderCursor()
        {
            if (cursorRing == null)
            {
                cursorRing = ViewRoot.NewSprite(ViewRoot.Effects, Layer.Fx + 2, "~Cursor");
                cursorRing.sprite = Art.Get("ring");
                cursorRing.sharedMaterial = Fx.Additive;
            }
            bool on = InputCtrl.MouseActive && State == GState.Playing;
            if (cursorRing.gameObject.activeSelf != on) cursorRing.gameObject.SetActive(on);
            if (!on) return;

            float r = 13f + Mathf.Sin(Time_ * 9f) * 2.5f;
            float s = r * 2f / Art.Get("ring").texture.width;
            cursorRing.transform.position = new Vector3(InputCtrl.CursorWorld.x, InputCtrl.CursorWorld.y, 0f);
            cursorRing.transform.localScale = new Vector3(s, s, 1f);
            cursorRing.color = new Color(Art.Cyan.r, Art.Cyan.g, Art.Cyan.b, .75f);
        }

        /// <summary>Vùng hiệu ứng: một sprite quầng sáng cộng sáng cho mỗi vùng.</summary>
        void RenderZones()
        {
            while (zoneViews.Count < Zones.Count)
            {
                var sr = ViewRoot.NewSprite(ViewRoot.Effects, Layer.Ground + 1, "zone");
                sr.sprite = Art.Get("glow");
                sr.sharedMaterial = Fx.Additive;
                zoneViews.Add(sr);
            }
            float texW = Art.Get("glow").texture.width;
            for (int i = 0; i < zoneViews.Count; i++)
            {
                bool on = i < Zones.Count;
                if (zoneViews[i].gameObject.activeSelf != on) zoneViews[i].gameObject.SetActive(on);
                if (!on) continue;
                var z = Zones[i];
                float t = Mathf.Clamp01(z.life / z.maxLife);
                zoneViews[i].transform.position = new Vector3(z.p.x, z.p.y, 0f);
                float s = z.r * 2f / texW;
                zoneViews[i].transform.localScale = new Vector3(s, s, 1f);
                zoneViews[i].color = new Color(z.color.r, z.color.g, z.color.b, .28f * t);
            }
        }

        /// <summary>Lỗ đen: một đĩa tối (trộn alpha) + một vành sáng (cộng sáng).</summary>
        void RenderHoles()
        {
            var holes = Sigils.Holes;
            while (holeCore.Count < holes.Count)
            {
                var core = ViewRoot.NewSprite(ViewRoot.Effects, Layer.Ground + 2, "holeCore");
                core.sprite = Art.Get("glow");                 // vật liệu mặc định = trộn alpha
                holeCore.Add(core);
                var ring = ViewRoot.NewSprite(ViewRoot.Effects, Layer.Ground + 3, "holeRing");
                ring.sprite = Art.Get("ring");
                ring.sharedMaterial = Fx.Additive;
                holeRing.Add(ring);
            }
            float coreW = Art.Get("glow").texture.width;
            float ringW = Art.Get("ring").texture.width;

            for (int i = 0; i < holeCore.Count; i++)
            {
                bool on = i < holes.Count;
                if (holeCore[i].gameObject.activeSelf != on)
                {
                    holeCore[i].gameObject.SetActive(on);
                    holeRing[i].gameObject.SetActive(on);
                }
                if (!on) continue;

                var h = holes[i];
                float t = Mathf.Clamp01(h.life / h.maxLife);
                float grow = h.life > h.maxLife - .3f ? (h.maxLife - h.life) / .3f : 1f;
                float R = h.r * grow;

                holeCore[i].transform.position = new Vector3(h.p.x, h.p.y, 0f);
                float cs = R * 2f / coreW;
                holeCore[i].transform.localScale = new Vector3(cs, cs, 1f);
                holeCore[i].color = new Color(.07f, .01f, .13f, .95f * t);

                holeRing[i].transform.position = new Vector3(h.p.x, h.p.y, 0f);
                float rs = R * 1.35f / ringW;
                holeRing[i].transform.localScale = new Vector3(rs, rs * .42f, 1f);
                holeRing[i].transform.rotation = Quaternion.Euler(0, 0, h.spin * Mathf.Rad2Deg);
                holeRing[i].color = new Color(.76f, .3f, 1f, .8f * t);
            }
        }
    }
}
