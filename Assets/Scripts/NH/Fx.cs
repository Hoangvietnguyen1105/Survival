// ============================================================
//  NEON HORDE — hiệu ứng hình ảnh
//  Hạt lửa dùng ParticleSystem của Unity (chạy trên GPU), phần còn lại là
//  SpriteRenderer / LineRenderer tái sử dụng.
// ============================================================
using System.Collections.Generic;
using UnityEngine;

namespace NH
{
    public static class Fx
    {
        public static Material Additive, AdditiveWhite;

        static ParticleSystem ps;
        static ParticleSystem.EmitParams ep;

        // ---- các nhóm tái sử dụng ----
        class Ringv { public SpriteRenderer sr; public float life, maxLife, r0, r1, w; public Color c; }
        class Textv { public TextMesh tm; public Transform tr; public float life, maxLife, size; public Vector2 pos, vel; public Color c; }
        class Linev { public LineRenderer lr; public float life, maxLife, w; public bool jag; public Vector2 a, b; public float seed; }
        class Ghostv { public SpriteRenderer sr; public float life; public Color c; }

        static readonly List<Ringv> rings = new List<Ringv>(64);
        static readonly List<Textv> texts = new List<Textv>(96);
        static readonly List<Linev> lines = new List<Linev>(64);
        static readonly List<Ghostv> ghosts = new List<Ghostv>(24);

        static Transform root;
        static Font font;

        // ---- camera ----
        public static float Shake_, ShakeOffX, ShakeOffY;
        public static Color FlashColor = Color.white;
        public static float FlashAmt;

        public static void Init()
        {
            if (root != null) return;
            ViewRoot.Ensure();
            root = ViewRoot.Effects;

            var sh = Shader.Find("NeonHorde/Additive");
            if (sh == null) sh = Shader.Find("Sprites/Default");

            // vật liệu cho hạt lửa & sprite (SpriteRenderer tự gắn texture của nó vào)
            Additive = new Material(sh) { mainTexture = Art.Get("spark").texture };

            // LineRenderer dùng thẳng mainTexture của vật liệu nên cần bản trắng trơn,
            // không thì tia laser/sét sẽ bị kéo giãn hình quầng sáng.
            AdditiveWhite = new Material(sh) { mainTexture = Art.Get("px").texture };

            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (font == null) font = Resources.GetBuiltinResource<Font>("Arial.ttf");

            BuildParticles();
        }

        static void BuildParticles()
        {
            var go = new GameObject("~Particles");
            go.transform.SetParent(root, false);
            ps = go.AddComponent<ParticleSystem>();

            var main = ps.main;
            main.loop = false;
            main.playOnAwake = false;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.maxParticles = 1400;
            main.startLifetime = .5f;
            main.startSpeed = 0f;
            main.startSize = 6f;
            main.gravityModifier = 0f;
            main.scalingMode = ParticleSystemScalingMode.Hierarchy;

            var em = ps.emission; em.enabled = false;
            var shp = ps.shape; shp.enabled = false;

            var col = ps.colorOverLifetime; col.enabled = true;
            var grad = new Gradient();
            grad.SetKeys(
                new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
                new[] { new GradientAlphaKey(1f, 0f), new GradientAlphaKey(.9f, .35f), new GradientAlphaKey(0f, 1f) });
            col.color = new ParticleSystem.MinMaxGradient(grad);

            var sz = ps.sizeOverLifetime; sz.enabled = true;
            var curve = new AnimationCurve(new Keyframe(0f, 1f), new Keyframe(1f, 0f));
            sz.size = new ParticleSystem.MinMaxCurve(1f, curve);

            var lim = ps.limitVelocityOverLifetime;
            lim.enabled = true; lim.dampen = .07f;
            lim.limit = new ParticleSystem.MinMaxCurve(4000f);

            var pr = go.GetComponent<ParticleSystemRenderer>();
            pr.material = Additive;
            pr.renderMode = ParticleSystemRenderMode.Billboard;
            pr.sortingOrder = Layer.Fx;
            pr.alignment = ParticleSystemRenderSpace.View;

            ps.Play();
        }

        // =========================================================
        //  HẠT LỬA
        // =========================================================
        public static void Spark(Vector2 pos, Vector2 vel, float life, float size, Color c)
        {
            if (ps == null || ps.particleCount >= 1350) return;
            ep.position = new Vector3(pos.x, pos.y, 0f);
            ep.velocity = new Vector3(vel.x, vel.y, 0f);
            ep.startLifetime = life;
            ep.startSize = size * 3.2f;
            ep.startColor = c;
            ps.Emit(ep, 1);
        }

        public static void Burst(Vector2 pos, int n, Color c, float speed = 200f, float life = .45f, float size = 5f,
                                 float angle = -999f, float spread = 3.15f)
        {
            for (int i = 0; i < n; i++)
            {
                float a = angle < -900f ? M.Rnd(M.TAU) : angle + M.Rnd(-spread, spread);
                Spark(pos, M.Dir(a) * speed * M.Rnd(.35f, 1.15f), life * M.Rnd(.6f, 1.25f), size * M.Rnd(.6f, 1.3f), c);
            }
        }

        public static void Trail(Vector2 pos, Color c, float size = 4f, float life = .3f)
            => Spark(pos, new Vector2(M.Rnd(-18f, 18f), M.Rnd(-18f, 18f)), life, size, c);

        public static void Smoke(Vector2 pos, Color c, int n = 4)
        {
            for (int i = 0; i < n; i++)
                Spark(pos + new Vector2(M.Rnd(-6f, 6f), M.Rnd(-6f, 6f)),
                      new Vector2(M.Rnd(-30f, 30f), M.Rnd(10f, 60f)), M.Rnd(.5f, 1f), M.Rnd(6f, 12f), c * .5f);
        }

        // =========================================================
        //  VÒNG SÓNG
        // =========================================================
        public static void Ring(Vector2 pos, float radius, Color c, float life = .35f, float width = 4f)
        {
            Ringv v = null;
            for (int i = 0; i < rings.Count; i++) if (rings[i].life <= 0f) { v = rings[i]; break; }
            if (v == null)
            {
                if (rings.Count >= 48) return;
                v = new Ringv { sr = ViewRoot.NewSprite(root, Layer.Fx, "ring") };
                v.sr.sprite = Art.Get("ring");
                v.sr.sharedMaterial = Additive;
                rings.Add(v);
            }
            v.life = v.maxLife = life;
            v.r0 = radius * .2f; v.r1 = radius; v.w = width; v.c = c;
            v.sr.transform.position = new Vector3(pos.x, pos.y, 0f);
            v.sr.gameObject.SetActive(true);
        }

        public static void Shockwave(Vector2 pos, float r, Color c)
        {
            Ring(pos, r, c, .45f, 6f);
            Ring(pos, r * .6f, Color.white, .25f, 3f);
        }

        // =========================================================
        //  SỐ SÁT THƯƠNG
        // =========================================================
        public static void Text(Vector2 pos, string s, Color c, float size = 15f)
        {
            Textv v = null;
            for (int i = 0; i < texts.Count; i++) if (texts[i].life <= 0f) { v = texts[i]; break; }
            if (v == null)
            {
                if (texts.Count >= 80) return;
                var go = new GameObject("dmg");
                go.transform.SetParent(root, false);
                var tm = go.AddComponent<TextMesh>();
                tm.font = font;
                tm.fontSize = 64;
                tm.characterSize = .28f;
                tm.anchor = TextAnchor.MiddleCenter;
                tm.alignment = TextAlignment.Center;
                tm.fontStyle = FontStyle.Bold;
                var mr = go.GetComponent<MeshRenderer>();
                if (font != null) mr.sharedMaterial = font.material;
                mr.sortingOrder = Layer.Text;
                v = new Textv { tm = tm, tr = go.transform };
                texts.Add(v);
            }
            v.tm.text = s;
            v.c = c;
            v.size = size;
            v.pos = pos;
            v.vel = new Vector2(M.Rnd(-26f, 26f), 62f);
            v.life = v.maxLife = .85f;
            v.tr.gameObject.SetActive(true);
        }

        // =========================================================
        //  ĐƯỜNG: LASER & SÉT
        // =========================================================
        static Linev GetLine()
        {
            for (int i = 0; i < lines.Count; i++) if (lines[i].life <= 0f) return lines[i];
            if (lines.Count >= 48) return null;
            var go = new GameObject("line");
            go.transform.SetParent(root, false);
            var lr = go.AddComponent<LineRenderer>();
            lr.useWorldSpace = true;
            lr.material = AdditiveWhite;
            lr.sortingOrder = Layer.Fx + 1;
            lr.numCapVertices = 2;
            lr.textureMode = LineTextureMode.Stretch;
            var v = new Linev { lr = lr };
            lines.Add(v);
            return v;
        }

        public static void Beam(Vector2 from, float ang, float len, float width) =>
            Beam(from, ang, len, width, new Color(1f, .18f, .53f));

        public static void Beam(Vector2 from, float ang, float len, float width, Color col)
        {
            var v = GetLine();
            if (v == null) return;
            v.a = from; v.b = from + M.Dir(ang) * len;
            v.w = width; v.life = v.maxLife = .26f; v.jag = false;
            v.lr.positionCount = 2;
            v.lr.SetPosition(0, new Vector3(v.a.x, v.a.y, 0f));
            v.lr.SetPosition(1, new Vector3(v.b.x, v.b.y, 0f));
            v.lr.startColor = col;
            v.lr.endColor = new Color(col.r, col.g, col.b, 0f);
            v.lr.gameObject.SetActive(true);
        }

        public static void Arc(Vector2 a, Vector2 b) => Arc(a, b, new Color(.79f, .66f, 1f));

        public static void Arc(Vector2 a, Vector2 b, Color col)
        {
            var v = GetLine();
            if (v == null) return;
            v.a = a; v.b = b; v.w = 5f; v.life = v.maxLife = .28f; v.jag = true;
            v.seed = M.Rnd(1000f);
            const int SEG = 14;
            v.lr.positionCount = SEG + 1;
            Vector2 d = (b - a) / SEG;
            Vector2 nrm = new Vector2(-(b.y - a.y), b.x - a.x).normalized;
            for (int i = 0; i <= SEG; i++)
            {
                float j = (i == 0 || i == SEG) ? 0f : (Mathf.Sin(v.seed + i * 12.9898f) * 43758.5453f % 1f - .5f) * 22f;
                Vector2 p = a + d * i + nrm * j;
                v.lr.SetPosition(i, new Vector3(p.x, p.y, 0f));
            }
            v.lr.startColor = col;
            v.lr.endColor = Color.white;
            v.lr.gameObject.SetActive(true);
        }

        // =========================================================
        //  BÓNG MỜ KHI LƯỚT
        // =========================================================
        public static void Afterimage(Vector2 pos, float face, Sprite sp, Vector3 scale, Color c)
        {
            Ghostv v = null;
            for (int i = 0; i < ghosts.Count; i++) if (ghosts[i].life <= 0f) { v = ghosts[i]; break; }
            if (v == null)
            {
                if (ghosts.Count >= 16) return;
                v = new Ghostv { sr = ViewRoot.NewSprite(root, Layer.Player - 2, "ghost") };
                v.sr.sharedMaterial = Additive;
                ghosts.Add(v);
            }
            v.sr.sprite = sp;
            v.c = c;
            v.life = .3f;
            v.sr.transform.position = new Vector3(pos.x, pos.y, 0f);
            v.sr.transform.rotation = Quaternion.Euler(0, 0, face * Mathf.Rad2Deg - 90f);
            v.sr.transform.localScale = scale;
            v.sr.gameObject.SetActive(true);
        }

        // =========================================================
        //  CAMERA
        // =========================================================
            /// <summary>
    /// Rung màn hình có GIẢM DẦN: càng đang rung mạnh thì cú rung mới càng ít tác dụng.
    /// Cộng thẳng thì một loạt 14 vụ nổ sẽ đẩy độ rung chạm trần, màn hình giật liên tục.
    /// </summary>
    public const float SHAKE_CAP = 12f;
    public static void Shake(float v) => Shake_ = Mathf.Min(SHAKE_CAP, Shake_ + v * (1f - Shake_ / SHAKE_CAP));
        public static void Flash(Color c, float amt) { FlashColor = c; FlashAmt = Mathf.Max(FlashAmt, amt); }

        // =========================================================
        //  CẬP NHẬT MỖI KHUNG HÌNH
        // =========================================================
        public static void Tick(float dt)
        {
            // rung
            if (Shake_ > 0f)
            {
                Shake_ = Mathf.Max(0f, Shake_ - dt * 52f);
                ShakeOffX = M.Rnd(-Shake_, Shake_);
                ShakeOffY = M.Rnd(-Shake_, Shake_);
            }
            else { ShakeOffX = ShakeOffY = 0f; }

            if (FlashAmt > 0f) FlashAmt = Mathf.Max(0f, FlashAmt - dt * 3.4f);

            // vòng sóng
            for (int i = 0; i < rings.Count; i++)
            {
                var v = rings[i];
                if (v.life <= 0f) continue;
                v.life -= dt;
                if (v.life <= 0f) { v.sr.gameObject.SetActive(false); continue; }
                float t = v.life / v.maxLife;
                float r = Mathf.Lerp(v.r0, v.r1, 1f - t);
                float s = r * 2f / Art.Get("ring").texture.width;
                v.sr.transform.localScale = new Vector3(s, s, 1f);
                v.sr.color = new Color(v.c.r, v.c.g, v.c.b, t * .9f);
            }

            // số sát thương
            for (int i = 0; i < texts.Count; i++)
            {
                var v = texts[i];
                if (v.life <= 0f) continue;
                v.life -= dt;
                if (v.life <= 0f) { v.tr.gameObject.SetActive(false); continue; }
                v.pos += v.vel * dt;
                v.vel.y -= 130f * dt;
                v.vel.x *= .94f;
                float t = v.life / v.maxLife;
                float pop = t > .82f ? 1f + (t - .82f) * 3.2f : 1f;
                v.tr.position = new Vector3(v.pos.x, v.pos.y, 0f);
                float cs = v.size / 64f * pop * 1.9f;
                v.tr.localScale = new Vector3(cs, cs, 1f);
                v.tm.color = new Color(v.c.r, v.c.g, v.c.b, Mathf.Min(1f, t * 2.2f));
            }

            // laser / sét
            for (int i = 0; i < lines.Count; i++)
            {
                var v = lines[i];
                if (v.life <= 0f) continue;
                v.life -= dt;
                if (v.life <= 0f) { v.lr.gameObject.SetActive(false); continue; }
                float t = v.life / v.maxLife;
                float w = v.w * t;
                v.lr.startWidth = w;
                v.lr.endWidth = v.jag ? w : w * .35f;
            }

            // bóng mờ
            for (int i = 0; i < ghosts.Count; i++)
            {
                var v = ghosts[i];
                if (v.life <= 0f) continue;
                v.life -= dt;
                if (v.life <= 0f) { v.sr.gameObject.SetActive(false); continue; }
                v.sr.color = new Color(v.c.r, v.c.g, v.c.b, v.life * 1.1f);
            }
        }

        public static void ClearAll()
        {
            if (ps != null) ps.Clear();
            foreach (var v in rings) { v.life = 0f; if (v.sr) v.sr.gameObject.SetActive(false); }
            foreach (var v in texts) { v.life = 0f; if (v.tr) v.tr.gameObject.SetActive(false); }
            foreach (var v in lines) { v.life = 0f; if (v.lr) v.lr.gameObject.SetActive(false); }
            foreach (var v in ghosts) { v.life = 0f; if (v.sr) v.sr.gameObject.SetActive(false); }
            Shake_ = 0f; FlashAmt = 0f;
        }
    }
}
