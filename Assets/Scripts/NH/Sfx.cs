// ============================================================
//  NEON HORDE — thư viện tiếng động + nhạc nền sinh theo thời gian thực
// ============================================================
using System.Collections.Generic;
using UnityEngine;

namespace NH
{
    public class Sfx : MonoBehaviour
    {
        public static Sfx I;

        readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>(40);
        readonly Dictionary<string, float> lastPlayed = new Dictionary<string, float>(40);

        AudioSource[] pool;
        int nextSrc;
        AudioSource[] musPool;
        int nextMus;

        public static bool Muted;

        // ---- nhạc ----
        bool musicOn;
        double nextStepTime;
        int step;
        float intensity;
        const float BPM = 138f;
        static readonly float[] Roots = { 55f, 55f, 73.42f, 65.41f, 55f, 55f, 82.41f, 65.41f };
        static readonly int[] BassPat = { 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0 };
        static readonly int[] ArpScale = { 0, 3, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3 };

        public static void Ensure()
        {
            if (I != null) return;
            var go = new GameObject("~NeonHorde.Audio");
            DontDestroyOnLoad(go);
            I = go.AddComponent<Sfx>();
            I.Build();
        }

        void Build()
        {
            pool = new AudioSource[26];
            for (int i = 0; i < pool.Length; i++) pool[i] = NewSource(1f);
            musPool = new AudioSource[14];
            for (int i = 0; i < musPool.Length; i++) musPool[i] = NewSource(.42f);

            Muted = SaveData.Muted;
            AudioListener.volume = Muted ? 0f : .85f;

            BuildClips();
        }

        AudioSource NewSource(float vol)
        {
            var s = gameObject.AddComponent<AudioSource>();
            s.playOnAwake = false;
            s.spatialBlend = 0f;
            s.volume = vol;
            return s;
        }

        // ============================================================
        //  Dựng toàn bộ mẫu tiếng
        // ============================================================
        void BuildClips()
        {
            float[] b;

            // ---- tiếng bắn ----
            b = Synth.Buffer(.1f); Synth.Tone(b, 0, 880, 340, .08f, Wave.Square, .5f, true, .004f, 2600);
            Add("sh_pistol", b);

            b = Synth.Buffer(.2f);
            Synth.NoiseHit(b, 0, 1700, 300, .17f, .7f, .7f);
            Synth.Tone(b, 0, 200, 70, .13f, Wave.Saw, .5f);
            Add("sh_shotgun", b);

            b = Synth.Buffer(.2f);
            Synth.Tone(b, 0, 1500, 2900, .18f, Wave.Saw, .38f, true, .004f, 4000);
            Synth.Tone(b, 0, 750, 1450, .18f, Wave.Square, .26f);
            Add("sh_laser", b);

            b = Synth.Buffer(.22f); Synth.NoiseHit(b, 0, 900, 2400, .2f, .45f, .6f);
            Add("sh_missile", b);

            b = Synth.Buffer(.14f); Synth.Tone(b, 0, 300, 620, .12f, Wave.Triangle, .5f);
            Add("sh_bomb", b);

            b = Synth.Buffer(.12f); Synth.NoiseHit(b, 0, 3200, 1100, .1f, .35f, 3f);
            Add("sh_blade", b);

            b = Synth.Buffer(.4f);
            Synth.Tone(b, 0, 1900, 620, .35f, Wave.Sine, .5f);
            Synth.Tone(b, .03f, 2540, 900, .3f, Wave.Sine, .3f);
            Add("sh_frost", b);

            b = Synth.Buffer(.26f);
            Synth.NoiseHit(b, 0, 2600, 480, .22f, .7f, .8f, "high");
            Synth.Tone(b, 0, 130, 44, .2f, Wave.Saw, .42f);
            Add("sh_lightning", b);

            b = Synth.Buffer(.16f); Synth.Tone(b, 0, 520, 260, .12f, Wave.Square, .3f);
            Add("enemyShot", b);

            // ---- va chạm ----
            b = Synth.Buffer(.08f); Synth.NoiseHit(b, 0, 1500, 480, .055f, .5f, 1.4f);
            Add("hit", b);

            b = Synth.Buffer(.13f);
            Synth.NoiseHit(b, 0, 2600, 700, .1f, .7f, 1.4f);
            Synth.Tone(b, 0, 1400, 2600, .09f, Wave.Square, .3f);
            Add("hitcrit", b);

            b = Synth.Buffer(.16f);
            Synth.NoiseHit(b, 0, 900, 160, .13f, .6f, .8f);
            Synth.Tone(b, 0, 300, 90, .11f, Wave.Triangle, .35f);
            Add("kill", b);

            b = Synth.Buffer(.36f);
            Synth.NoiseHit(b, 0, 1100, 60, .32f, .75f, .5f);
            Synth.Tone(b, 0, 190, 30, .26f, Wave.Saw, .5f, true, .004f, 900, 90);
            Add("explode", b);

            b = Synth.Buffer(.7f);
            Synth.NoiseHit(b, 0, 700, 60, .62f, .9f, .5f);
            Synth.Tone(b, 0, 120, 30, .5f, Wave.Saw, .7f, true, .004f, 900, 90);
            Add("explodeBig", b);

            b = Synth.Buffer(.3f);
            Synth.Tone(b, 0, 260, 70, .26f, Wave.Saw, .6f, true, .004f, 1100, 200);
            Synth.NoiseHit(b, 0, 400, 120, .2f, .5f, .6f);
            Add("hurt", b);

            b = Synth.Buffer(.12f); Synth.Tone(b, 0, 1180, 1770, .07f, Wave.Sine, .45f);
            Add("pickup", b);

            b = Synth.Buffer(.16f);
            Synth.Tone(b, 0, 1560, 0, .05f, Wave.Square, .3f);
            Synth.Tone(b, .04f, 2340, 0, .09f, Wave.Square, .26f);
            Add("coin", b);

            b = Synth.Buffer(.55f);
            float[] healNotes = { 523, 659, 784, 1046 };
            for (int i = 0; i < 4; i++) Synth.Tone(b, i * .055f, healNotes[i], 0, .3f, Wave.Sine, .3f);
            Add("heal", b);

            b = Synth.Buffer(.85f);
            float[] lvNotes = { 523, 698, 880, 1046, 1318 };
            for (int i = 0; i < 5; i++) Synth.Tone(b, i * .07f, lvNotes[i], 0, .45f, Wave.Triangle, .32f);
            Synth.Tone(b, 0, 130, 520, .5f, Wave.Saw, .26f, true, .004f, 2000);
            Add("levelup", b);

            b = Synth.Buffer(.12f); Synth.Tone(b, 0, 1250, 1850, .09f, Wave.Square, .38f);
            Add("select", b);

            b = Synth.Buffer(.05f); Synth.Tone(b, 0, 900, 0, .035f, Wave.Sine, .22f);
            Add("hover", b);

            b = Synth.Buffer(.28f);
            Synth.NoiseHit(b, 0, 340, 2900, .24f, .55f, .7f);
            Synth.Tone(b, 0, 420, 1150, .18f, Wave.Triangle, .3f);
            Add("dash", b);

            b = Synth.Buffer(.12f); Synth.Tone(b, 0, 900, 1400, .08f, Wave.Sine, .3f);
            Add("dodge", b);

            // XIỀNG XÍCH: tiếng "cạch" trầm khi bấm lướt mà bị luật khoá
            b = Synth.Buffer(.16f); Synth.Tone(b, 0, 150, 60, .14f, Wave.Square, .35f);
            Add("dashBlocked", b);

            b = Synth.Buffer(.8f);
            float[] wsNotes = { 392, 523, 659 };
            for (int i = 0; i < 3; i++) Synth.Tone(b, i * .1f, wsNotes[i], 0, .5f, Wave.Square, .3f, true, .004f, 2400);
            Add("waveStart", b);

            b = Synth.Buffer(1f);
            float[] wcNotes = { 523, 659, 784, 1046, 1318, 1568 };
            for (int i = 0; i < 6; i++) Synth.Tone(b, i * .085f, wcNotes[i], 0, .55f, Wave.Triangle, .3f);
            Add("waveClear", b);

            b = Synth.Buffer(1.6f);
            Synth.Tone(b, 0, 62, 44, 1.5f, Wave.Saw, .6f, true, .01f, 420);
            Synth.NoiseHit(b, 0, 180, 60, 1.4f, .5f, .4f);
            for (int i = 0; i < 3; i++) Synth.Tone(b, .25f + i * .3f, 220, 165, .35f, Wave.Square, .3f);
            Add("bossWarn", b);

            b = Synth.Buffer(1.9f);
            float[] goNotes = { 440, 392, 330, 262, 196 };
            for (int i = 0; i < 5; i++) Synth.Tone(b, i * .19f, goNotes[i], 0, .85f, Wave.Saw, .34f, true, .006f, 1400);
            Add("gameOver", b);

            b = Synth.Buffer(1.1f);
            float[] chNotes = { 659, 784, 988, 1318, 1568, 2093 };
            for (int i = 0; i < 6; i++) Synth.Tone(b, i * .06f, chNotes[i], 0, .7f, Wave.Sine, .28f);
            Add("chest", b);

            // ---- nhạc nền ----
            b = Synth.Buffer(.22f); Synth.Tone(b, 0, 130, 40, .18f, Wave.Sine, .85f);
            Add("m_kick", b);

            b = Synth.Buffer(.18f); Synth.NoiseHit(b, 0, 1900, 0, .14f, .5f, .8f);
            Add("m_snare", b);

            b = Synth.Buffer(.08f); Synth.NoiseHit(b, 0, 7000, 0, .05f, .35f, .7f, "high");
            Add("m_hat", b);

            // bass tham chiếu 110 Hz — đổi cao độ bằng pitch lúc phát
            b = Synth.Buffer(.28f); Synth.Tone(b, 0, 110, 0, .24f, Wave.Saw, .6f, true, .006f, 900, 240);
            Add("m_bass", b);

            // arp tham chiếu 440 Hz
            b = Synth.Buffer(.2f); Synth.Tone(b, 0, 440, 0, .16f, Wave.Square, .5f);
            Add("m_arp", b);

            // pad tham chiếu 220 Hz
            b = Synth.Buffer(2.0f); Synth.Tone(b, 0, 220, 0, 1.9f, Wave.Saw, .35f, true, .5f, 1100);
            Add("m_pad", b);
        }

        void Add(string name, float[] buf) => clips[name] = Synth.ToClip(buf, name);

        // ============================================================
        //  Phát tiếng
        // ============================================================
        bool Gate(string name, float ms)
        {
            float now = Time.unscaledTime;
            if (lastPlayed.TryGetValue(name, out float t) && (now - t) * 1000f < ms) return false;
            lastPlayed[name] = now;
            return true;
        }

        public static void Play(string name, float vol = 1f, float pitch = 1f, float gateMs = 0f)
        {
            if (I == null || Muted) return;
            if (gateMs > 0f && !I.Gate(name, gateMs)) return;
            if (!I.clips.TryGetValue(name, out var c)) return;
            var s = I.pool[I.nextSrc];
            I.nextSrc = (I.nextSrc + 1) % I.pool.Length;
            s.clip = c; s.volume = vol; s.pitch = pitch;
            s.Play();
        }

        public static void Shoot(string kind)
        {
            switch (kind)
            {
                case "pistol": Play("sh_pistol", .55f, M.Rnd(.96f, 1.05f), 40); break;
                case "shotgun": Play("sh_shotgun", .8f, M.Rnd(.95f, 1.05f), 40); break;
                case "laser": Play("sh_laser", .7f, 1f, 40); break;
                case "missile": Play("sh_missile", .6f, M.Rnd(.9f, 1.1f), 40); break;
                case "bomb": Play("sh_bomb", .7f, 1f, 40); break;
                case "blade": Play("sh_blade", .45f, M.Rnd(.9f, 1.15f), 45); break;
                case "frost": Play("sh_frost", .7f, 1f, 40); break;
                case "lightning": Play("sh_lightning", .8f, M.Rnd(.95f, 1.06f), 40); break;
                default: Play("sh_pistol", .5f, 1f, 40); break;
            }
        }

        public static void Hit(bool crit) => Play(crit ? "hitcrit" : "hit", crit ? .8f : .55f, M.Rnd(.93f, 1.08f), 26);
        public static void Kill() => Play("kill", .6f, M.Rnd(.9f, 1.1f), 34);
        public static void Explode(bool big) => Play(big ? "explodeBig" : "explode", big ? 1f : .7f, M.Rnd(.94f, 1.06f), 30);
        public static void Pickup() => Play("pickup", .5f, M.Rnd(.95f, 1.12f), 34);

        public static void BossDie()
        {
            if (I != null) I.StartCoroutine(I.BossDieRoutine());
        }

        System.Collections.IEnumerator BossDieRoutine()
        {
            Explode(true);
            for (int i = 0; i < 6; i++)
            {
                yield return new WaitForSecondsRealtime(.13f + M.Rnd(.09f));
                Explode(M.Chance(.4f));
            }
        }

        public static void SetMuted(bool m)
        {
            Muted = m;
            SaveData.Muted = m;
            AudioListener.volume = m ? 0f : .85f;
        }

        // ============================================================
        //  Nhạc nền — máy sequencer lên lịch trước bằng dspTime
        // ============================================================
        public static void StartMusic()
        {
            if (I == null || I.musicOn) return;
            I.musicOn = true;
            I.step = 0;
            I.nextStepTime = AudioSettings.dspTime + .15;
        }

        public static void StopMusic() { if (I != null) I.musicOn = false; }
        public static void SetIntensity(float v) { if (I != null) I.intensity = M.Clamp01(v); }

        void Update()
        {
            if (!musicOn || Muted) return;
            double spb = 60.0 / BPM / 4.0;                 // độ dài nốt móc kép
            double now = AudioSettings.dspTime;
            int guard = 0;
            while (nextStepTime < now + 0.12 && guard++ < 64)
            {
                ScheduleStep(step, nextStepTime, (float)spb);
                nextStepTime += spb;
                step++;
            }
        }

        void Sched(string clip, double when, float vol, float pitch)
        {
            if (!clips.TryGetValue(clip, out var c)) return;
            var s = musPool[nextMus];
            nextMus = (nextMus + 1) % musPool.Length;
            s.clip = c; s.volume = vol; s.pitch = pitch;
            s.PlayScheduled(when);
        }

        void ScheduleStep(int st, double t, float spb)
        {
            int s = ((st % 16) + 16) % 16;
            int bar = (st / 16) % 8;
            float I2 = intensity;
            float root = Roots[bar];

            if (s == 0 || s == 6 || s == 10 || (I2 > .35f && s == 14))
                Sched("m_kick", t, .5f, 1f);

            if (s == 4 || s == 12)
                Sched("m_snare", t, .3f, 1f);

            if (I2 > .12f && s % 2 == 1)
                Sched("m_hat", t, (s % 4 == 3 ? .16f : .1f) * (.6f + I2 * .6f), M.Rnd(.95f, 1.06f));

            if (BassPat[s] == 1)
                Sched("m_bass", t, .34f, root / 110f);

            if (I2 > .22f && s % 2 == 0)
            {
                int semi = ArpScale[((st / 2) % ArpScale.Length + ArpScale.Length) % ArpScale.Length];
                float f = root * 4f * Mathf.Pow(2f, semi / 12f);
                Sched("m_arp", t, .07f + I2 * .09f, f / 440f);
            }

            if (s == 0 && I2 > .05f)
                Sched("m_pad", t, .06f + I2 * .05f, root * 2f / 220f);
        }
    }
}
