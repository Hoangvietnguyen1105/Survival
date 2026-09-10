// ============================================================
//  NEON HORDE — toàn bộ SỐ LIỆU của game.
//  Muốn chỉnh độ khó / sức mạnh thì sửa ở file này là chính.
// ============================================================
using System;
using System.Collections.Generic;
using UnityEngine;

namespace NH
{
    // ---------------------------------------------------------
    //  Chỉ số người chơi
    // ---------------------------------------------------------
    public class Stats
    {
        public float maxHp, regen, armor, dodge;
        public float moveSpeed, damage, haste, area;
        public int proj;
        public float crit, critDmg, pickup, lifesteal, xpGain;

        public static Stats Base() => new Stats
        {
            maxHp = 100f, regen = 0f, armor = 0f, dodge = 0f,
            moveSpeed = 1f, damage = 1f, haste = 1f, area = 1f,
            proj = 0,
            crit = .05f, critDmg = 1.6f, pickup = 96f,
            lifesteal = 0f, xpGain = 1f
        };
    }

    // ---------------------------------------------------------
    //  Định nghĩa
    // ---------------------------------------------------------
    public class CharDef
    {
        public string Id, Name, Role, Sprite, Weapon, Desc;
        public Color Color;
        public Action<Stats> Apply;
        public string ModText;
    }

    public struct WStat
    {
        public float dmg, cd, spd, radius, slow, dur, range, rot, rad;
        public int n, chain;
    }

    public class WeaponInst
    {
        public string id;
        public int lv = 1;
        public float t;
        public bool evolved;
        public GameCtrl.Zone blizzard;   // BÃO TUYẾT VĨNH CỬU giữ vùng băng của nó ở đây
        public float reactor = 1f;       // LÒ PHẢN ỨNG: hệ số nở của hào quang
    }

    public class WeaponDef
    {
        public string Id, Name, Tip, EvoName, EvoDesc, PairId;
        public Color Color;
        public int Max = 8;
        public bool Continuous;                       // kiếm xoay: xử lý mỗi khung hình
        public float EvoCd = 1f;                      // hệ số hồi chiêu riêng cho bản tiến hoá
        public Func<int, WStat> Stat;
        public Func<int, string> Desc;
        public Func<GameCtrl, WeaponInst, bool> Fire; // trả về false nếu không có mục tiêu
        public Action<TexCanvas, float> DrawIcon;
    }

    public class PassiveInst { public string id; public int lv; }

    public class PassiveDef
    {
        public string Id, Name;
        public Color Color;
        public int Max = 5;
        public Func<int, string> Desc;
        public Action<Stats, int> Apply;
        public Action<TexCanvas, float> DrawIcon;
    }

    public class EnemyDef
    {
        public string Id, Sprite, Ai;
        public float R, Hp, Spd, Dmg, KnockRes, DeathBomb, Range;
        public int Xp, Split;
        public Color Color;
    }

    public class BossDef
    {
        public string Name, Sprite;
        public Color Color;
        public float R, Hp, Spd, Dmg;
        public int Xp;
        public string[] Patterns;
        public string Rule;              // khoá vào GameData.BossRules
    }

    /* LUẬT ĐẤU TRƯỜNG: hiệu lực suốt trận đánh trùm rồi gỡ.
       Mọi luật đều bóp DI CHUYỂN / TẦM NHÌN / HỒI MÁU — không luật nào đụng
       vào vũ khí, vì bắn là tự động: khoá vũ khí thì người chơi chỉ ngồi nhìn. */
    public class BossRuleDef
    {
        public string Name, Desc;
        public Color Color;
    }

    // =========================================================
    //  KHO DỮ LIỆU
    // =========================================================
    public static class GameData
    {
        static string Hi(object v) => "<color=#b6ff3a><b>" + v + "</b></color>";
        static Vector2 V(float x, float y) => new Vector2(x, y);

        // ---------------------------------------------------------
        //  NHÂN VẬT
        // ---------------------------------------------------------
        public static readonly List<CharDef> Characters = new List<CharDef>
        {
            new CharDef {
                Id="guard", Name="VỆ BINH", Role="TANK", Sprite="ch_guard", Weapon="blade",
                Color=M.Hex("#ff8a3c"), Desc="Thân thể thép nguội. Chậm mà chắc.",
                ModText="Máu +45 · Giáp +3 · Tốc chạy -8% · Phạm vi +10%",
                Apply = s => { s.maxHp += 45f; s.armor += 3f; s.moveSpeed -= .08f; s.area += .10f; }
            },
            new CharDef {
                Id="ranger", Name="XẠ THỦ", Role="DPS", Sprite="ch_ranger", Weapon="pistol",
                Color=M.Hex("#25f4ee"), Desc="Bắn nhanh như chớp, tay không bao giờ run.",
                ModText="Tốc đánh +20% · Tầm hút +30 · Tốc chạy +4%",
                Apply = s => { s.haste += .20f; s.pickup += 30f; s.moveSpeed += .04f; }
            },
            new CharDef {
                Id="mage", Name="PHÁP SƯ", Role="AOE", Sprite="ch_mage", Weapon="lightning",
                Color=M.Hex("#9d6bff"), Desc="Gọi sấm sét. Mong manh nhưng huỷ diệt.",
                ModText="Sát thương +20% · Phạm vi +18% · Máu -18",
                Apply = s => { s.damage += .20f; s.area += .18f; s.maxHp -= 18f; }
            },
            new CharDef {
                Id="assassin", Name="SÁT THỦ", Role="CHÍ MẠNG", Sprite="ch_assassin", Weapon="boomerang",
                Color=M.Hex("#ff2e88"), Desc="Một nhát chí mạng đáng giá mười nhát thường.",
                ModText="Chí mạng +18% · ST chí mạng +30% · Tốc chạy +13% · Máu -22",
                Apply = s => { s.crit += .18f; s.critDmg += .3f; s.moveSpeed += .13f; s.maxHp -= 22f; }
            },
            new CharDef {
                Id="engineer", Name="KỸ SƯ", Role="HỖ TRỢ", Sprite="ch_engineer", Weapon="bomb",
                Color=M.Hex("#b6ff3a"), Desc="Thêm một quả đạn cho mọi thứ. Càng đông càng vui.",
                ModText="+1 đạn · EXP +15% · Hồi máu +0.5/s",
                Apply = s => { s.proj += 1; s.xpGain += .15f; s.regen += .5f; }
            },
        };

        public static CharDef Char(string id) => Characters.Find(c => c.Id == id) ?? Characters[0];

        // ---------------------------------------------------------
        //  VŨ KHÍ
        // ---------------------------------------------------------
        public static readonly Dictionary<string, WeaponDef> Weapons = new Dictionary<string, WeaponDef>();
        public static readonly List<string> WeaponIds = new List<string>();

        // ---------------------------------------------------------
        //  TRANG BỊ BỊ ĐỘNG
        // ---------------------------------------------------------
        public static readonly Dictionary<string, PassiveDef> Passives = new Dictionary<string, PassiveDef>();
        public static readonly List<string> PassiveIds = new List<string>();

        // ---------------------------------------------------------
        //  QUÁI
        // ---------------------------------------------------------
        public static readonly Dictionary<string, EnemyDef> Enemies = new Dictionary<string, EnemyDef>();

        public struct SpawnRow { public string id; public int from; public float w; }
        public static readonly SpawnRow[] SpawnTable =
        {
            new SpawnRow{ id="grunt",    from=1, w=10f  },
            new SpawnRow{ id="swarm",    from=2, w=8f   },
            new SpawnRow{ id="charger",  from=3, w=4f   },
            new SpawnRow{ id="shooter",  from=4, w=4f   },
            new SpawnRow{ id="tank",     from=5, w=3f   },
            new SpawnRow{ id="bomber",   from=6, w=3.5f },
            new SpawnRow{ id="splitter", from=7, w=3.5f },
            new SpawnRow{ id="orbiter",  from=8, w=3.5f },
        };

        public static readonly Dictionary<string, BossRuleDef> BossRules = new Dictionary<string, BossRuleDef>
        {
            { "bloodthirst", new BossRuleDef{ Name="KHÁT MÁU",   Color=M.Hex("#ff2e4d"), Desc="Không tự hồi máu · hút máu vô hiệu" } },
            { "gravity",     new BossRuleDef{ Name="HẤP LỰC",    Color=M.Hex("#c14dff"), Desc="Bị kéo về phía trùm" } },
            { "chained",     new BossRuleDef{ Name="XIỀNG XÍCH", Color=M.Hex("#ffb02e"), Desc="Không lướt được" } },
            { "frostbite",   new BossRuleDef{ Name="BĂNG GIÁ",   Color=M.Hex("#6fe6ff"), Desc="Tốc chạy −35%" } },
            { "inverted",    new BossRuleDef{ Name="ĐẢO CHIỀU",  Color=M.Hex("#3affa0"), Desc="Điều khiển bị đảo ngược" } },
            { "eclipse",     new BossRuleDef{ Name="NHẬT THỰC",  Color=M.Hex("#ff6a2e"), Desc="Chỉ nhìn thấy quanh mình" } },
            { "hive",        new BossRuleDef{ Name="TÁCH BẦY",   Color=M.Hex("#ff2e88"), Desc="Quái thường chết đều tách đôi" } },
            { "collapse",    new BossRuleDef{ Name="THU HẸP",    Color=M.Hex("#eafcff"), Desc="Đấu trường co lại dần" } },
        };

        /* ---------- TRÙM ----------
         * Thứ tự trong mảng = thứ tự xuất hiện (màn 5, 10, 15, 20, ...) nên phải xếp
         * từ dễ tới khó. Hết mảng thì QUAY VÒNG lại từ đầu — độ khó về sau do
         * `tier` trong StartBoss() lo, KHÔNG phải do cộng thêm máu gốc ở đây.
         *
         * ⚠ Máu gốc cố ý chỉ nhích nhẹ từ con thứ 4 trở đi. StartBoss() đã nhân
         *   `(1 + tier*2.4) * (1 + (màn-5)*0.12)` — ở màn 40 hệ số đã là ~30 lần.
         *   Nếu để máu gốc cũng tăng gấp đôi mỗi con thì trùm màn 40 thành bất tử.
         */
        public static readonly BossDef[] Bosses =
        {
            new BossDef{ Name="HUYẾT NHÃN",      Sprite="e_boss",  Color=M.Hex("#ff2e4d"), R=56f, Hp=1500f, Spd=46f, Dmg=26f, Xp=60,  Rule="bloodthirst",
                         Patterns=new[]{ "radial","charge","summon" } },
            new BossDef{ Name="HƯ KHÔNG GIẢ",    Sprite="e_boss2", Color=M.Hex("#c14dff"), R=58f, Hp=3400f, Spd=52f, Dmg=30f, Xp=110, Rule="gravity",
                         Patterns=new[]{ "spiral","summon","laserSweep" } },
            new BossDef{ Name="BẠO CHÚA THÉP",   Sprite="e_boss3", Color=M.Hex("#ffb02e"), R=62f, Hp=6800f, Spd=58f, Dmg=36f, Xp=200, Rule="chained",
                         Patterns=new[]{ "radial","spiral","charge","summon" } },
            new BossDef{ Name="SƯƠNG HÀN VƯƠNG", Sprite="e_boss4", Color=M.Hex("#6fe6ff"), R=60f, Hp=7000f, Spd=50f, Dmg=38f, Xp=280, Rule="frostbite",
                         Patterns=new[]{ "frostNova","radial","charge","summon" } },
            new BossDef{ Name="NGHỊCH ẢNH",      Sprite="e_boss5", Color=M.Hex("#3affa0"), R=54f, Hp=7600f, Spd=68f, Dmg=40f, Xp=340, Rule="inverted",
                         Patterns=new[]{ "mirrorDash","spiral","laserSweep" } },
            new BossDef{ Name="HẮC NHẬT",        Sprite="e_boss6", Color=M.Hex("#ff6a2e"), R=66f, Hp=8200f, Spd=46f, Dmg=42f, Xp=420, Rule="eclipse",
                         Patterns=new[]{ "sunburst","radial","spiral","summon" } },
            new BossDef{ Name="TRÙNG MẪU",       Sprite="e_boss7", Color=M.Hex("#ff2e88"), R=64f, Hp=8800f, Spd=54f, Dmg=44f, Xp=500, Rule="hive",
                         Patterns=new[]{ "broodSurge","radial","charge" } },
            new BossDef{ Name="VÔ TẬN",          Sprite="e_boss8", Color=M.Hex("#eafcff"), R=70f, Hp=9600f, Spd=62f, Dmg=48f, Xp=640, Rule="collapse",
                         Patterns=new[]{ "laserCross","spiral","radial","charge","summon" } },
        };

        // =========================================================
        static GameData()
        {
            BuildWeapons();
            BuildPassives();
            BuildEnemies();
        }

        static void W(WeaponDef d) { Weapons[d.Id] = d; WeaponIds.Add(d.Id); }
        static void P(PassiveDef d) { Passives[d.Id] = d; PassiveIds.Add(d.Id); }

        // ---------------------------------------------------------
        static void BuildWeapons()
        {
            // ---------- 1. SÚNG XUNG KÍCH ----------
            W(new WeaponDef
            {
                Id = "pistol", Name = "SÚNG XUNG KÍCH", Color = M.Hex("#25f4ee"), PairId = "proj", EvoCd = .85f,
                EvoName = "ĐẠN PHÂN LIỆT",
                EvoDesc = "Viên đạn nào hạ gục kẻ địch sẽ tách thành 2 viên con tự truy đuổi — cứ thế 3 đời, tạo phản ứng dây chuyền.",
                Tip = "Bắn nhanh vào kẻ địch gần nhất.",
                Stat = lv => new WStat { dmg = 11f + lv * 4.2f, cd = .62f - lv * .035f, n = 1 + (lv >= 4 ? 1 : 0) + (lv >= 7 ? 1 : 0), spd = 640f },
                Desc = lv => { var s = Weapons["pistol"].Stat(lv); return $"Sát thương {Hi(Mathf.Round(s.dmg))} · {s.n} viên · {(1f / s.cd):0.0}/giây"; },
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#25f4ee");
                    g.LineRound(V(-r * .6f, -r * .1f), V(r * .45f, -r * .1f), c, 5);
                    g.LineRound(V(-r * .3f, -r * .1f), V(-r * .5f, r * .5f), c, 5);
                    g.FillCircle(V(r * .58f, -r * .1f), 4.5f, M.Hex("#eafcff"));
                },
                Fire = (G, w) =>
                {
                    var st = Weapons["pistol"].Stat(w.lv);
                    var tgt = G.NearestEnemy(G.Player.pos, 900f);
                    if (tgt == null) return false;
                    float baseA = M.Ang(G.Player.pos, tgt.pos);
                    int n = st.n + G.Stats.proj;
                    const float spread = .1f;
                    for (int i = 0; i < n; i++)
                    {
                        var s = G.Spec();
                        s.pos = G.Player.pos; s.ang = baseA + (n > 1 ? (i - (n - 1) * .5f) * spread : 0f);
                        s.spd = st.spd; s.dmg = st.dmg * (w.evolved ? .52f : 1f) * G.Stats.damage;
                        s.sprite = "b_basic";
                        s.color = w.evolved ? M.Hex("#8ff6ff") : M.Hex("#25f4ee");
                        s.radius = (w.evolved ? 9f : 7f) * G.Stats.area; s.life = 1.3f;
                        s.pierce = w.evolved ? 1 : 0; s.scale = G.Stats.area; s.knock = 90f;
                        s.split = w.evolved ? 2 : 0;   // ĐẠN PHÂN LIỆT: 2 đời (3+ đời là nổ dây chuyền hàm mũ)
                        G.SpawnBullet(s);
                    }
                    Sfx.Shoot("pistol");
                    G.Muzzle(G.Player.pos, baseA, M.Hex("#25f4ee"), 1f);
                    return true;
                }
            });

            // ---------- 2. SÚNG SĂN ----------
            W(new WeaponDef
            {
                Id = "shotgun", Name = "SÚNG SĂN", Color = M.Hex("#ffc93c"), PairId = "pow", EvoCd = .48f,
                EvoName = "PHÁO HẠM",
                EvoDesc = "Không còn bắn chùm: nã một quả đạn pháo khổng lồ bay chậm, xuyên qua tất cả và rải một chuỗi vụ nổ dọc đường đi.",
                Tip = "Bắn chùm đạn hình nón, cực mạnh ở cự ly gần.",
                Stat = lv => new WStat { dmg = 8f + lv * 2.9f, cd = 1.15f - lv * .055f, n = 4 + Mathf.FloorToInt(lv * .7f), spd = 560f, range = .62f },
                Desc = lv => { var s = Weapons["shotgun"].Stat(lv); return $"{Hi(s.n)} viên × {Hi(Mathf.Round(s.dmg))} sát thương"; },
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#ffc93c");
                    g.LineRound(V(-r * .6f, r * .25f), V(r * .2f, -r * .25f), c, 5);
                    for (int i = -1; i <= 1; i++)
                        g.FillCircle(V(r * .5f + Mathf.Abs(i) * 4f, -r * .35f + i * r * .3f), 4f, M.Hex("#fff2c4"));
                },
                Fire = (G, w) =>
                {
                    var st = Weapons["shotgun"].Stat(w.lv);
                    var tgt = G.NearestEnemy(G.Player.pos, 620f);
                    if (tgt == null) return false;
                    float baseA = M.Ang(G.Player.pos, tgt.pos);

                    if (w.evolved)
                    {
                        // PHÁO HẠM — một quả đạn khổng lồ, xuyên tất cả, rải nổ dọc đường
                        float A = G.Stats.area;
                        var s = G.Spec();
                        s.pos = G.Player.pos; s.ang = baseA; s.spd = 300f;
                        s.dmg = st.dmg * .42f * G.Stats.damage;
                        s.sprite = "b_bomb"; s.color = M.Hex("#ffb02e");
                        s.radius = 34f * A; s.life = 2.6f; s.pierce = 999;
                        s.scale = A; s.knock = 420f; s.spin = 5f;
                        s.SetTrailBoom(.12f, 82f * A, st.dmg * .24f * G.Stats.damage, M.Hex("#ffb02e"));
                        s.SetAoe(190f * A, st.dmg * 3f * G.Stats.damage, M.Hex("#ffb02e"), true, 0);
                        G.SpawnBullet(s);
                        Sfx.Shoot("shotgun"); Sfx.Explode(false);
                        G.Muzzle(G.Player.pos, baseA, M.Hex("#ffb02e"), 3f);
                        Fx.Shake(5f);
                        return true;
                    }

                    int n = st.n + G.Stats.proj;
                    for (int i = 0; i < n; i++)
                    {
                        var s = G.Spec();
                        s.pos = G.Player.pos;
                        s.ang = baseA + M.Rnd(-st.range, st.range);
                        s.spd = st.spd * M.Rnd(.8f, 1.2f); s.dmg = st.dmg * G.Stats.damage;
                        s.sprite = "b_pellet"; s.color = M.Hex("#ffc93c");
                        s.radius = 6f * G.Stats.area; s.life = .55f; s.scale = G.Stats.area; s.knock = 130f;
                        G.SpawnBullet(s);
                    }
                    Sfx.Shoot("shotgun");
                    G.Muzzle(G.Player.pos, baseA, M.Hex("#ffc93c"), 1.6f);
                    Fx.Shake(2.5f);
                    return true;
                }
            });

            // ---------- 3. KIẾM XOAY ----------
            W(new WeaponDef
            {
                Id = "blade", Name = "KIẾM XOAY", Color = M.Hex("#25f4ee"), PairId = "area",
                EvoName = "THIÊN LUÂN",
                EvoDesc = "Hai vòng kiếm quay ngược chiều nhau, và mỗi nhát chém bắn ra một sóng xung kích chém lan sang kẻ địch bên cạnh.",
                Tip = "Lưỡi kiếm bay quanh bạn, chém mọi thứ chạm vào.",
                Continuous = true,
                Stat = lv => new WStat { dmg = 14f + lv * 5.5f, n = 2 + lv / 2, rot = 2.5f + lv * .12f, rad = 78f + lv * 5f },
                Desc = lv => { var s = Weapons["blade"].Stat(lv); return $"{Hi(s.n)} lưỡi · {Hi(Mathf.Round(s.dmg))} sát thương mỗi lần chạm"; },
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#25f4ee");
                    for (int k = 0; k < 12; k += 2)
                        g.StrokeArc(V(0, 0), r * .5f, k / 12f * M.TAU, (k + 1) / 12f * M.TAU, c, 3);
                    for (int i = 0; i < 3; i++)
                    {
                        float a = i / 3f * M.TAU;
                        Vector2 o = V(Mathf.Cos(a) * r * .5f, Mathf.Sin(a) * r * .5f);
                        float ca = Mathf.Cos(a), sa = Mathf.Sin(a);
                        Func<float, float, Vector2> R = (x, y) => o + V(x * ca - y * sa, x * sa + y * ca);
                        g.FillPoly(new[] { R(-6, -5), R(7, 0), R(-6, 5) }, M.Hex("#eafcff"));
                    }
                },
                Fire = (G, w) => false
            });

            // ---------- 4. LÔI KÍCH ----------
            W(new WeaponDef
            {
                Id = "lightning", Name = "LÔI KÍCH", Color = M.Hex("#9d6bff"), PairId = "pow", EvoCd = 1.25f,
                EvoName = "LÔI VŨ",
                EvoDesc = "Không lan nữa — gọi 9 tia sét giáng thẳng từ trời, mỗi chỗ rơi để lại một vũng điện thiêu đốt 3 giây.",
                Tip = "Sét đánh kẻ địch rồi lan sang mục tiêu kế bên.",
                Stat = lv => new WStat { dmg = 20f + lv * 8f, cd = 1.5f - lv * .085f, chain = 2 + Mathf.FloorToInt(lv * .8f), range = 300f },
                Desc = lv => { var s = Weapons["lightning"].Stat(lv); return $"{Hi(Mathf.Round(s.dmg))} sát thương · lan {Hi(s.chain)} mục tiêu"; },
                DrawIcon = (g, r) =>
                {
                    var p = new[]{ V(r*.15f,-r*.65f), V(-r*.35f,r*.05f), V(-r*.02f,r*.05f),
                                   V(-r*.18f,r*.65f), V(r*.38f,-r*.12f), V(r*.04f,-r*.12f) };
                    g.FillPoly(p, M.Hex("#c9a8ff"));
                    g.StrokePoly(p, M.Hex("#9d6bff"), 2);
                },
                Fire = (G, w) =>
                {
                    var st = Weapons["lightning"].Stat(w.lv);
                    if (w.evolved)
                    {
                        // LÔI VŨ — sét giáng từ trời, để lại vũng điện
                        if (G.NearestEnemy(G.Player.pos, 900f) == null) return false;
                        G.ThunderRain(5 + G.Stats.proj / 2,
                                      st.dmg * .15f * G.Stats.damage,
                                      st.dmg * .5f * G.Stats.damage);
                        Sfx.Shoot("lightning");
                        return true;
                    }
                    var first = G.NearestEnemy(G.Player.pos, st.range * G.Stats.area * 1.6f);
                    if (first == null) return false;
                    G.ChainLightning(G.Player.pos, first, st.chain + G.Stats.proj, st.dmg * G.Stats.damage, false);
                    Sfx.Shoot("lightning");
                    Fx.Shake(3f);
                    return true;
                }
            });

            // ---------- 5. BOM RẢI ----------
            W(new WeaponDef
            {
                Id = "bomb", Name = "BOM RẢI", Color = M.Hex("#ffb02e"), PairId = "area", EvoCd = 1.25f,
                EvoName = "BOM HẠT NHÂN",
                EvoDesc = "Vụ nổ khổng lồ văng ra 5 quả bom con, và để lại hố phóng xạ cháy 5 giây ngay tại tâm.",
                Tip = "Ném bom nổ diện rộng.",
                Stat = lv => new WStat { dmg = 30f + lv * 11f, cd = 1.9f - lv * .1f, radius = 86f + lv * 7f, n = 1 + lv / 4 },
                Desc = lv => { var s = Weapons["bomb"].Stat(lv); return $"Nổ {Hi(Mathf.Round(s.dmg))} sát thương · bán kính {Hi(Mathf.Round(s.radius))}"; },
                DrawIcon = (g, r) =>
                {
                    g.FillCircle(V(0, r * .12f), r * .42f, M.Hex("#3a3f5c"));
                    g.StrokeCircle(V(0, r * .12f), r * .42f, M.Hex("#ffb02e"), 2.5f);
                    g.LineRound(V(r * .2f, -r * .24f), V(r * .35f, -r * .68f), M.Hex("#ffe6b0"), 2.5f);
                    g.FillCircle(V(r * .35f, -r * .68f), 3.5f, Color.white);
                },
                Fire = (G, w) =>
                {
                    var st = Weapons["bomb"].Stat(w.lv);
                    int n = st.n + G.Stats.proj;
                    bool any = false;
                    for (int i = 0; i < n; i++)
                    {
                        var tgt = G.RandomEnemyNear(G.Player.pos, 520f);
                        float a = tgt != null ? M.Ang(G.Player.pos, tgt.pos) : M.Rnd(M.TAU);
                        float d = tgt != null ? Mathf.Min(Vector2.Distance(G.Player.pos, tgt.pos), 480f) : M.Rnd(140f, 300f);
                        var s = G.Spec();
                        s.pos = G.Player.pos; s.ang = a; s.spd = 340f; s.dmg = 0f;
                        s.sprite = "b_bomb"; s.color = M.Hex("#ffb02e");
                        s.radius = 11f; s.life = d / 340f; s.scale = G.Stats.area; s.spin = 9f; s.lob = true;
                        s.SetAoe(st.radius * G.Stats.area * (w.evolved ? 1.10f : 1f),
                                 st.dmg * G.Stats.damage * (w.evolved ? 1.33f : 1f),
                                 M.Hex("#ffb02e"), true, w.evolved ? 3 : 0,
                                 // BOM HẠT NHÂN: để lại hố phóng xạ cháy 4 giây
                                 w.evolved ? 4f : 0f, st.dmg * .28f * G.Stats.damage);
                        G.SpawnBullet(s);
                        any = true;
                    }
                    if (any) Sfx.Shoot("bomb");
                    return any;
                }
            });

            // ---------- 6. TIA TỬ THẦN ----------
            W(new WeaponDef
            {
                Id = "laser", Name = "TIA TỬ THẦN", Color = M.Hex("#ff2e88"), PairId = "haste", EvoCd = .95f,
                EvoName = "LĂNG KÍNH",
                EvoDesc = "Tia laser nảy 6 lần giữa các kẻ địch, mỗi lần nảy đổi một màu cầu vồng và vẫn xuyên thấu toàn bộ.",
                Tip = "Tia laser xuyên qua toàn bộ kẻ địch trên đường đi.",
                Stat = lv => new WStat { dmg = 26f + lv * 12f, cd = 1.75f - lv * .1f, radius = 12f + lv * 2.4f, range = 900f },
                Desc = lv => { var s = Weapons["laser"].Stat(lv); return $"{Hi(Mathf.Round(s.dmg))} sát thương xuyên thấu · dày {Hi(Mathf.Round(s.radius))}"; },
                DrawIcon = (g, r) =>
                {
                    for (int i = 0; i < 24; i++)
                    {
                        float t = i / 23f;
                        float x = Mathf.Lerp(-r * .75f, r * .75f, t);
                        float a = Mathf.Sin(t * Mathf.PI);
                        g.FillRect(x, -5, r * 1.5f / 24f + 1f, 10, new Color(1f, .55f, .75f, a));
                    }
                    g.FillRect(-r * .75f, -1.6f, r * 1.5f, 3.2f, Color.white);
                },
                Fire = (G, w) =>
                {
                    var st = Weapons["laser"].Stat(w.lv);
                    var tgt = G.NearestEnemy(G.Player.pos, 1000f);
                    if (tgt == null) return false;
                    if (w.evolved)
                    {
                        // LĂNG KÍNH — tia nảy 6 lần, mỗi lần một màu cầu vồng
                        G.PrismBeam(tgt, 6 + G.Stats.proj / 2, st.dmg * .67f * G.Stats.damage, st.radius * 1.15f * G.Stats.area);
                        Sfx.Shoot("laser");
                        return true;
                    }
                    float baseA = M.Ang(G.Player.pos, tgt.pos);
                    G.FireLaser(G.Player.pos, baseA, st.range, st.radius * G.Stats.area, st.dmg * G.Stats.damage);
                    Sfx.Shoot("laser");
                    Fx.Shake(4f);
                    return true;
                }
            });

            // ---------- 7. BĂNG VỰC ----------
            W(new WeaponDef
            {
                Id = "frost", Name = "BĂNG VỰC", Color = M.Hex("#6fe6ff"), PairId = "area",
                EvoName = "BÃO TUYẾT VĨNH CỬU",
                EvoDesc = "Không còn từng đợt — một cơn bão tuyết bám theo bạn suốt màn chơi, liên tục làm chậm và gặm sát thương.",
                Tip = "Sóng băng lan ra, gây sát thương và làm chậm.",
                Stat = lv => new WStat { dmg = 12f + lv * 5.5f, cd = 2.4f - lv * .13f, radius = 130f + lv * 16f, slow = .35f + lv * .04f, dur = 1.6f + lv * .1f },
                Desc = lv => { var s = Weapons["frost"].Stat(lv); return $"{Hi(Mathf.Round(s.dmg))} sát thương · làm chậm {Hi(Mathf.Round(s.slow * 100f) + "%")}"; },
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#6fe6ff");
                    for (int i = 0; i < 6; i++)
                    {
                        float a = i / 6f * M.TAU;
                        Vector2 tip = V(Mathf.Cos(a) * r * .62f, Mathf.Sin(a) * r * .62f);
                        Vector2 mid = V(Mathf.Cos(a) * r * .38f, Mathf.Sin(a) * r * .38f);
                        g.LineRound(V(0, 0), tip, c, 2.6f);
                        g.LineRound(mid, V(Mathf.Cos(a + .5f) * r * .52f, Mathf.Sin(a + .5f) * r * .52f), c, 2.6f);
                        g.LineRound(mid, V(Mathf.Cos(a - .5f) * r * .52f, Mathf.Sin(a - .5f) * r * .52f), c, 2.6f);
                    }
                },
                Fire = (G, w) =>
                {
                    var st = Weapons["frost"].Stat(w.lv);
                    if (w.evolved)
                    {
                        // BÃO TUYẾT VĨNH CỬU — vùng băng bám theo người chơi, không dứt
                        if (w.blizzard == null || w.blizzard.life <= 0f)
                        {
                            w.blizzard = G.AddZone(G.Player.pos, st.radius * .78f * G.Stats.area, 999f,
                                                   st.dmg * 1.6f * G.Stats.damage, M.Hex("#aef3ff"),
                                                   .5f, true, 30f);
                            UIRoot.I.Announce("BÃO TUYẾT", M.Hex("#aef3ff"));
                        }
                        w.blizzard.r = st.radius * .78f * G.Stats.area;
                        w.blizzard.dps = st.dmg * 1.6f * G.Stats.damage;
                        for (int i = 0; i < 3; i++)
                        {
                            var s = G.Spec();
                            s.pos = G.Player.pos; s.ang = M.Rnd(M.TAU); s.spd = 460f;
                            s.dmg = st.dmg * G.Stats.damage;
                            s.sprite = "b_frost"; s.color = M.Hex("#aef3ff");
                            s.radius = 10f * G.Stats.area; s.life = .9f; s.pierce = 2;
                            s.scale = G.Stats.area; s.spin = 10f; s.slow = .35f;
                            G.SpawnBullet(s);
                        }
                        Sfx.Shoot("frost");
                        return true;
                    }
                    G.FrostNova(G.Player.pos, st.radius * G.Stats.area, st.dmg * G.Stats.damage,
                                st.slow, st.dur, false);
                    Sfx.Shoot("frost");
                    return true;
                }
            });

            // ---------- 8. TÊN LỬA TẦM NHIỆT ----------
            W(new WeaponDef
            {
                Id = "missile", Name = "TÊN LỬA TẦM NHIỆT", Color = M.Hex("#ff2e88"), PairId = "proj", EvoCd = 1.25f,
                EvoName = "HOẢ TIỄN OANH TẠC",
                EvoDesc = "Phóng loạt 14 quả bay vòng cung lên trời rồi rơi rải khắp màn hình, mỗi quả nổ diện rộng.",
                Tip = "Tên lửa tự truy đuổi kẻ địch.",
                Stat = lv => new WStat { dmg = 22f + lv * 8.5f, cd = 1.5f - lv * .08f, n = 1 + lv / 2, rot = 4.5f },
                Desc = lv => { var s = Weapons["missile"].Stat(lv); return $"{Hi(s.n)} tên lửa × {Hi(Mathf.Round(s.dmg))} sát thương"; },
                DrawIcon = (g, r) =>
                {
                    float ca = Mathf.Cos(-.6f), sa = Mathf.Sin(-.6f);
                    Func<float, float, Vector2> R = (x, y) => V(x * ca - y * sa, x * sa + y * ca);
                    var p = new[] { R(r * .62f, 0), R(-r * .3f, -r * .26f), R(-r * .12f, 0), R(-r * .3f, r * .26f) };
                    g.FillPoly(p, M.Hex("#ffd2e6"));
                    g.StrokePoly(p, M.Hex("#ff2e88"), 2);
                    g.LineRound(R(-r * .3f, 0), R(-r * .72f, 0), M.Hex("#ffb02e"), 3);
                },
                Fire = (G, w) =>
                {
                    var st = Weapons["missile"].Stat(w.lv);
                    if (G.NearestEnemy(G.Player.pos, 1200f) == null) return false;

                    if (w.evolved)
                    {
                        // HOẢ TIỄN OANH TẠC — loạt 14 quả bay vòng cung rồi rơi khắp màn hình
                        float A = G.Stats.area;
                        int total = 8 + G.Stats.proj;
                        for (int i = 0; i < total; i++)
                        {
                            var tg = G.RandomEnemyNear(G.Player.pos, 700f);
                            float a = tg != null ? M.Ang(G.Player.pos, tg.pos) + M.Rnd(-.25f, .25f) : M.Rnd(M.TAU);
                            float d = tg != null
                                ? Mathf.Min(Vector2.Distance(G.Player.pos, tg.pos), 640f)
                                : M.Rnd(200f, 500f);
                            var s = G.Spec();
                            s.pos = G.Player.pos; s.ang = a; s.spd = 400f; s.dmg = 0f;
                            s.sprite = "b_missile"; s.color = M.Hex("#ff2e88");
                            s.radius = 11f * A; s.life = d / 400f; s.scale = A;
                            s.spin = 4f; s.lob = true; s.delay = i * .045f;
                            s.hasTrail = true; s.trail = M.Hex("#ff88bb");
                            s.SetAoe(84f * A, st.dmg * .25f * G.Stats.damage, M.Hex("#ff2e88"), false, 0);
                            G.SpawnBullet(s);
                        }
                        Sfx.Shoot("missile");
                        Fx.Shake(6f);
                        return true;
                    }

                    int n = st.n + G.Stats.proj;
                    for (int i = 0; i < n; i++)
                    {
                        var s = G.Spec();
                        s.pos = G.Player.pos; s.ang = M.Rnd(M.TAU); s.spd = 190f;
                        s.dmg = st.dmg * G.Stats.damage;
                        s.sprite = "b_missile"; s.color = M.Hex("#ff2e88");
                        s.radius = 9f * G.Stats.area; s.life = 3.4f;
                        s.homing = st.rot; s.accel = 800f; s.maxSpd = 620f;
                        s.scale = G.Stats.area; s.hasTrail = true; s.trail = M.Hex("#ff88bb");
                        s.delay = i * .07f;
                        G.SpawnBullet(s);
                    }
                    Sfx.Shoot("missile");
                    return true;
                }
            });

            // ---------- 9. HÀO QUANG HUỶ DIỆT ----------
            W(new WeaponDef
            {
                Id = "aura", Name = "HÀO QUANG HUỶ DIỆT", Color = M.Hex("#b6ff3a"), PairId = "area",
                EvoName = "LÒ PHẢN ỨNG",
                EvoDesc = "Hào quang tự nở to theo số kẻ địch đứng bên trong, và cứ mỗi nhịp lại phóng tia điện tới tất cả chúng.",
                Tip = "Vùng năng lượng quanh bạn liên tục gây sát thương.",
                Stat = lv => new WStat { dmg = 9f + lv * 3.8f, cd = .5f, radius = 92f + lv * 11f },
                Desc = lv => { var s = Weapons["aura"].Stat(lv); return $"{Hi(Mathf.Round(s.dmg * 2f))} sát thương/giây · bán kính {Hi(Mathf.Round(s.radius))}"; },
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#b6ff3a");
                    g.StrokeCircle(V(0, 0), r * .66f, c, 2.4f);
                    g.StrokeCircle(V(0, 0), r * .45f, new Color(c.r, c.g, c.b, .55f), 2.4f);
                    g.FillCircle(V(0, 0), r * .2f, M.Hex("#e6ffb0"));
                },
                Fire = (G, w) =>
                {
                    var st = Weapons["aura"].Stat(w.lv);
                    float R = st.radius * G.Stats.area;

                    if (w.evolved)
                    {
                        // LÒ PHẢN ỨNG — nở theo số kẻ địch bên trong, rồi phóng điện tới tất cả
                        int inside = G.EnemiesInRadius(G.Player.pos, R * 1.1f).Count;
                        w.reactor = Mathf.Lerp(w.reactor, 1.05f + Mathf.Min(inside, 18) * .008f, .25f);
                        R *= w.reactor;
                        var hits = G.EnemiesInRadius(G.Player.pos, R);
                        foreach (var e in hits)
                        {
                            G.DamageEnemy(e, st.dmg * 1.6f * G.Stats.damage, 0f, 0f, true, true);
                            if (M.Chance(.5f)) Fx.Arc(G.Player.pos, e.pos, M.Hex("#e6ffb0"));
                        }
                        if (hits.Count > 0) Fx.Ring(G.Player.pos, R, Art.Lime, .22f, 3f);
                        G.AuraPulse(G.Player.pos, R, true);
                        return true;
                    }

                    foreach (var e in G.EnemiesInRadius(G.Player.pos, R))
                        G.DamageEnemy(e, st.dmg * G.Stats.damage, 0f, 0f, true, true);
                    G.AuraPulse(G.Player.pos, R, false);
                    return true;
                }
            });

            // ---------- 10. PHI TIÊU HỒI ----------
            W(new WeaponDef
            {
                Id = "boomerang", Name = "PHI TIÊU HỒI", Color = M.Hex("#eafcff"), PairId = "crit", EvoCd = .9f,
                EvoName = "LƯỠI HÁI TỬ THẦN",
                EvoDesc = "Phi tiêu bay mãi không quay về, và mỗi lần chém trúng lại to thêm và mạnh thêm 9% — càng đông càng khủng khiếp.",
                Tip = "Phi tiêu bay đi rồi quay về, xuyên nhiều kẻ địch.",
                Stat = lv => new WStat { dmg = 16f + lv * 6.5f, cd = 1.25f - lv * .06f, n = 1 + lv / 3, range = 300f + lv * 16f },
                Desc = lv => { var s = Weapons["boomerang"].Stat(lv); return $"{Hi(s.n)} phi tiêu × {Hi(Mathf.Round(s.dmg))} · xuyên thấu"; },
                DrawIcon = (g, r) =>
                {
                    var p = TexCanvas.StarPoints(4, r * .66f, r * .2f, .3f);
                    g.FillPoly(p, M.Hex("#eafcff"));
                    g.StrokePoly(p, M.Hex("#8ad8ff"), 1.6f);
                    g.FillCircle(V(0, 0), r * .13f, M.Hex("#0a0f1e"));
                },
                Fire = (G, w) =>
                {
                    var st = Weapons["boomerang"].Stat(w.lv);
                    var tgt = G.NearestEnemy(G.Player.pos, 800f);
                    float baseA = tgt != null ? M.Ang(G.Player.pos, tgt.pos) : M.Rnd(M.TAU);
                    int n = st.n + G.Stats.proj + (w.evolved ? 2 : 0);
                    for (int i = 0; i < n; i++)
                    {
                        var s = G.Spec();
                        s.pos = G.Player.pos; s.ang = baseA + (n > 1 ? (i - (n - 1) * .5f) * .5f : 0f);
                        s.spd = 620f; s.dmg = st.dmg * (w.evolved ? 1.03f : 1f) * G.Stats.damage;
                        s.sprite = "b_blade"; s.color = M.Hex("#eafcff");
                        s.radius = 17f * G.Stats.area; s.life = w.evolved ? 8f : 3f;
                        s.pierce = 999; s.spin = 17f; s.boomerang = true;
                        // tiến hoá: bay vòng NGẮN hơn để luôn quẩn trong đám đông
                        s.range = st.range * G.Stats.area * (w.evolved ? .5f : 1f); s.scale = G.Stats.area;
                        s.hitCd = w.evolved ? .18f : .35f; s.noReturn = w.evolved;
                        // LƯỠI HÁI: mỗi lần chém trúng lại to & mạnh thêm 9%, tối đa 12 lần
                        s.grow = w.evolved ? .11f : 0f; s.growCap = 8;
                        G.SpawnBullet(s);
                    }
                    Sfx.Shoot("blade");
                    return true;
                }
            });
        }

        // ---------------------------------------------------------
        static void BuildPassives()
        {
            P(new PassiveDef
            {
                Id = "pow", Name = "NGỌC CƯỜNG LỰC", Color = M.Hex("#ff4d5e"),
                Desc = lv => $"Sát thương {Hi("+" + lv * 12 + "%")}",
                Apply = (s, lv) => s.damage += .12f * lv,
                DrawIcon = (g, r) => { var p = TexCanvas.StarPoints(4, r * .62f, r * .24f); g.FillPoly(p, M.Hex("#ff8a95")); g.StrokePoly(p, M.Hex("#ff4d5e"), 2.4f); }
            });
            P(new PassiveDef
            {
                Id = "haste", Name = "ĐỒNG HỒ CÁT", Color = M.Hex("#25f4ee"),
                Desc = lv => $"Tốc độ tấn công {Hi("+" + lv * 11 + "%")}",
                Apply = (s, lv) => s.haste += .11f * lv,
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#25f4ee");
                    var p = new[] { V(-r * .42f, -r * .55f), V(r * .42f, -r * .55f), V(-r * .42f, r * .55f), V(r * .42f, r * .55f) };
                    g.StrokePoly(p, c, 3);
                    g.FillPoly(new[] { V(-r * .3f, r * .48f), V(r * .3f, r * .48f), V(0, r * .1f) }, new Color(c.r, c.g, c.b, .5f));
                }
            });
            P(new PassiveDef
            {
                Id = "speed", Name = "GIÀY GIÓ", Color = M.Hex("#b6ff3a"),
                Desc = lv => $"Tốc độ di chuyển {Hi("+" + lv * 8 + "%")}",
                Apply = (s, lv) => s.moveSpeed += .08f * lv,
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#b6ff3a");
                    for (int i = -1; i <= 1; i++)
                        g.LineRound(V(-r * .6f, i * r * .3f), V(r * .2f - Mathf.Abs(i) * r * .2f, i * r * .3f), c, 3.4f);
                    g.LineRound(V(r * .1f, -r * .45f), V(r * .62f, 0), c, 3.4f);
                    g.LineRound(V(r * .62f, 0), V(r * .1f, r * .45f), c, 3.4f);
                }
            });
            P(new PassiveDef
            {
                Id = "hp", Name = "TIM THÉP", Color = M.Hex("#ff4d6b"),
                Desc = lv => $"Máu tối đa {Hi("+" + lv * 22)}",
                Apply = (s, lv) => s.maxHp += 22f * lv,
                DrawIcon = (g, r) =>
                {
                    var p = new List<Vector2>();
                    for (int i = 0; i < 24; i++)
                    {
                        float t = i / 24f * M.TAU;
                        float x = 16f * Mathf.Pow(Mathf.Sin(t), 3f);
                        float y = -(13f * Mathf.Cos(t) - 5f * Mathf.Cos(2 * t) - 2f * Mathf.Cos(3 * t) - Mathf.Cos(4 * t));
                        p.Add(V(x / 16f * r * .6f, y / 16f * r * .6f));
                    }
                    g.FillPoly(p, M.Hex("#ff4d6b"));
                    g.StrokePoly(p, M.Hex("#ffd0d8"), 2);
                }
            });
            P(new PassiveDef
            {
                Id = "armor", Name = "GIÁP RỒNG", Color = M.Hex("#8fa8ff"),
                Desc = lv => $"Giáp {Hi("+" + lv * 2)} (giảm sát thương nhận)",
                Apply = (s, lv) => s.armor += 2f * lv,
                DrawIcon = (g, r) =>
                {
                    var p = new[]{ V(0,-r*.62f), V(r*.5f,-r*.34f), V(r*.5f,r*.16f), V(r*.28f,r*.55f),
                                   V(0,r*.66f), V(-r*.28f,r*.55f), V(-r*.5f,r*.16f), V(-r*.5f,-r*.34f) };
                    g.FillPoly(p, new Color(143 / 255f, 168 / 255f, 1f, .35f));
                    g.StrokePoly(p, M.Hex("#8fa8ff"), 2.6f);
                }
            });
            P(new PassiveDef
            {
                Id = "magnet", Name = "NAM CHÂM", Color = M.Hex("#4de1ff"),
                Desc = lv => $"Tầm hút vật phẩm {Hi("+" + lv * 40)}",
                Apply = (s, lv) => s.pickup += 40f * lv,
                DrawIcon = (g, r) =>
                {
                    g.StrokeArc(V(0, r * .12f), r * .42f, Mathf.PI, M.TAU, M.Hex("#4de1ff"), r * .26f);
                    g.Line(V(-r * .42f, r * .12f), V(-r * .42f, r * .46f), M.Hex("#ff4d5e"), r * .26f);
                    g.Line(V(r * .42f, r * .12f), V(r * .42f, r * .46f), M.Hex("#ff4d5e"), r * .26f);
                }
            });
            P(new PassiveDef
            {
                Id = "crit", Name = "KÍNH SÁT THỦ", Color = M.Hex("#ffc93c"),
                Desc = lv => $"Tỉ lệ chí mạng {Hi("+" + lv * 8 + "%")}",
                Apply = (s, lv) => s.crit += .08f * lv,
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#ffc93c");
                    g.StrokeCircle(V(0, 0), r * .58f, c, 2.6f);
                    g.StrokeCircle(V(0, 0), r * .24f, c, 2f);
                    g.LineRound(V(-r * .78f, 0), V(-r * .34f, 0), c, 2f);
                    g.LineRound(V(r * .34f, 0), V(r * .78f, 0), c, 2f);
                    g.LineRound(V(0, -r * .78f), V(0, -r * .34f), c, 2f);
                    g.LineRound(V(0, r * .34f), V(0, r * .78f), c, 2f);
                }
            });
            P(new PassiveDef
            {
                Id = "critd", Name = "MÓNG VUỐT", Color = M.Hex("#ff8a3c"),
                Desc = lv => $"Sát thương chí mạng {Hi("+" + lv * 30 + "%")}",
                Apply = (s, lv) => s.critDmg += .3f * lv,
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#ff8a3c");
                    for (int i = -1; i <= 1; i++)
                    {
                        float ox = i * r * .3f;
                        Vector2 prev = V(-r * .5f + ox, -r * .6f);
                        for (int k = 1; k <= 8; k++)
                        {
                            float t = k / 8f;
                            // đường cong bậc hai
                            Vector2 p0 = V(-r * .5f + ox, -r * .6f), p1 = V(r * .1f + ox, 0), p2 = V(-r * .2f + ox, r * .62f);
                            Vector2 cur = Vector2.Lerp(Vector2.Lerp(p0, p1, t), Vector2.Lerp(p1, p2, t), t);
                            g.LineRound(prev, cur, c, 4);
                            prev = cur;
                        }
                    }
                }
            });
            P(new PassiveDef
            {
                Id = "regen", Name = "BÙA HỒI SINH", Color = M.Hex("#3affa0"),
                Desc = lv => $"Hồi {Hi((lv * .9f).ToString("0.0"))} máu mỗi giây",
                Apply = (s, lv) => s.regen += .9f * lv,
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#3affa0");
                    g.FillRect(-r * .16f, -r * .58f, r * .32f, r * 1.16f, c);
                    g.FillRect(-r * .58f, -r * .16f, r * 1.16f, r * .32f, c);
                }
            });
            P(new PassiveDef
            {
                Id = "area", Name = "ĐÁ MỞ RỘNG", Color = M.Hex("#9d6bff"),
                Desc = lv => $"Phạm vi kỹ năng {Hi("+" + lv * 14 + "%")}",
                Apply = (s, lv) => s.area += .14f * lv,
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#9d6bff");
                    g.StrokeCircle(V(0, 0), r * .3f, c, 2.4f);
                    g.StrokeCircle(V(0, 0), r * .52f, new Color(c.r, c.g, c.b, .6f), 2.4f);
                    g.StrokeCircle(V(0, 0), r * .72f, new Color(c.r, c.g, c.b, .3f), 2.4f);
                    g.FillCircle(V(0, 0), r * .13f, M.Hex("#d9c4ff"));
                }
            });
            P(new PassiveDef
            {
                Id = "proj", Name = "ỐNG ĐẠN PHỤ", Color = M.Hex("#ffc93c"), Max = 3,
                Desc = lv => $"Tất cả vũ khí {Hi("+" + lv)} đạn",
                Apply = (s, lv) => s.proj += lv,
                DrawIcon = (g, r) =>
                {
                    for (int i = -1; i <= 1; i++)
                    {
                        float ox = i * r * .38f;
                        var p = new[]{ V(ox,-r*.55f), V(ox+r*.16f,-r*.3f), V(ox+r*.16f,r*.5f),
                                       V(ox-r*.16f,r*.5f), V(ox-r*.16f,-r*.3f) };
                        g.FillPoly(p, M.Hex("#ffc93c"));
                        g.StrokePoly(p, M.Hex("#a86e00"), 1.4f);
                    }
                }
            });
            P(new PassiveDef
            {
                Id = "lifesteal", Name = "HUYẾT ẤN", Color = M.Hex("#ff2e88"),
                Desc = lv => $"Hút {Hi((lv * 1.4f).ToString("0.0") + "%")} sát thương thành máu",
                Apply = (s, lv) => s.lifesteal += .014f * lv,
                DrawIcon = (g, r) =>
                {
                    var p = new List<Vector2> { V(0, -r * .62f) };
                    for (int i = 1; i <= 12; i++)
                    {
                        float t = i / 12f * Mathf.PI;
                        p.Add(V(Mathf.Sin(t) * r * .45f, Mathf.Lerp(-r * .62f, r * .62f, i / 12f) * .9f + r * .1f));
                    }
                    for (int i = 11; i >= 1; i--)
                    {
                        float t = i / 12f * Mathf.PI;
                        p.Add(V(-Mathf.Sin(t) * r * .45f, Mathf.Lerp(-r * .62f, r * .62f, i / 12f) * .9f + r * .1f));
                    }
                    g.FillPoly(p, M.Hex("#ff2e88"));
                }
            });
            P(new PassiveDef
            {
                Id = "dodge", Name = "ÁO CHOÀNG BÓNG", Color = M.Hex("#8fa8ff"),
                Desc = lv => $"Né tránh {Hi("+" + lv * 6 + "%")}",
                Apply = (s, lv) => s.dodge += .06f * lv,
                DrawIcon = (g, r) =>
                {
                    var p = new[]{ V(0,-r*.6f), V(r*.45f,-r*.15f), V(r*.42f,r*.62f), V(0,r*.3f), V(-r*.42f,r*.62f), V(-r*.45f,-r*.15f) };
                    g.FillPoly(p, new Color(143 / 255f, 168 / 255f, 1f, .35f));
                    g.StrokePoly(p, M.Hex("#8fa8ff"), 2.4f);
                }
            });
            P(new PassiveDef
            {
                Id = "xp", Name = "SÁCH CỔ", Color = M.Hex("#25f4ee"),
                Desc = lv => $"Kinh nghiệm nhận được {Hi("+" + lv * 16 + "%")}",
                Apply = (s, lv) => s.xpGain += .16f * lv,
                DrawIcon = (g, r) =>
                {
                    var c = M.Hex("#25f4ee");
                    var p = new[]{ V(-r*.55f,-r*.45f), V(0,-r*.3f), V(r*.55f,-r*.45f),
                                   V(r*.55f,r*.5f), V(0,r*.35f), V(-r*.55f,r*.5f) };
                    g.FillPoly(p, new Color(c.r, c.g, c.b, .25f));
                    g.StrokePoly(p, c, 2.2f);
                    g.LineRound(V(0, -r * .3f), V(0, r * .35f), c, 2.2f);
                }
            });
        }

        // ---------------------------------------------------------
        static void BuildEnemies()
        {
            void E(EnemyDef d) => Enemies[d.Id] = d;

            E(new EnemyDef { Id = "grunt", Sprite = "e_grunt", R = 15, Hp = 22, Spd = 80, Dmg = 9, Xp = 1, Color = M.Hex("#ff4d5e"), Ai = "chase" });
            E(new EnemyDef { Id = "swarm", Sprite = "e_swarm", R = 10, Hp = 10, Spd = 136, Dmg = 6, Xp = 1, Color = M.Hex("#ffa62e"), Ai = "chase" });
            E(new EnemyDef { Id = "tank", Sprite = "e_tank", R = 27, Hp = 130, Spd = 48, Dmg = 18, Xp = 5, Color = M.Hex("#8f5bff"), Ai = "chase", KnockRes = .75f });
            E(new EnemyDef { Id = "shooter", Sprite = "e_shooter", R = 16, Hp = 34, Spd = 64, Dmg = 8, Xp = 3, Color = M.Hex("#3ce0ff"), Ai = "shoot", Range = 320 });
            E(new EnemyDef { Id = "splitter", Sprite = "e_splitter", R = 19, Hp = 46, Spd = 74, Dmg = 10, Xp = 3, Color = M.Hex("#3affa0"), Ai = "chase", Split = 3 });
            E(new EnemyDef { Id = "charger", Sprite = "e_charger", R = 17, Hp = 42, Spd = 72, Dmg = 16, Xp = 3, Color = M.Hex("#ffe23c"), Ai = "charge" });
            E(new EnemyDef { Id = "bomber", Sprite = "e_bomber", R = 18, Hp = 30, Spd = 92, Dmg = 10, Xp = 3, Color = M.Hex("#ff5ecf"), Ai = "chase", DeathBomb = 34 });
            E(new EnemyDef { Id = "orbiter", Sprite = "e_orbiter", R = 14, Hp = 40, Spd = 110, Dmg = 9, Xp = 2, Color = M.Hex("#7cff2e"), Ai = "orbit" });
        }
    }
}
