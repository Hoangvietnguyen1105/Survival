// ============================================================
//  NEON HORDE — bộ tổng hợp âm thanh
//  Không dùng file mp3/wav nào. Mọi tiếng động được dựng từ sóng dao động
//  + nhiễu trắng ngay lúc khởi động, giống hệt bản web dùng WebAudio.
// ============================================================
using System;
using UnityEngine;

namespace NH
{
    public enum Wave { Sine, Square, Saw, Triangle, Noise }

    /// <summary>Công cụ dựng mẫu âm thanh thành AudioClip.</summary>
    public static class Synth
    {
        public const int SR = 44100;

        public static float[] Buffer(float seconds) => new float[Mathf.CeilToInt(SR * seconds)];

        static float Osc(Wave w, float phase, ref uint rng)
        {
            switch (w)
            {
                case Wave.Sine: return Mathf.Sin(phase);
                case Wave.Square: return Mathf.Sin(phase) >= 0f ? 1f : -1f;
                case Wave.Saw: return (phase / M.TAU % 1f) * 2f - 1f;
                case Wave.Triangle: return Mathf.Abs((phase / M.TAU % 1f) * 4f - 2f) - 1f;
                default:
                    rng = rng * 1664525u + 1013904223u;
                    return ((rng >> 8) & 0xFFFF) / 32768f - 1f;
            }
        }

        /// <summary>Bao âm: lên nhanh rồi tắt dần theo hàm mũ.</summary>
        static float Env(float t, float dur, float atk)
        {
            if (t >= dur) return 0f;
            if (t < atk) return atk <= 0f ? 1f : t / atk;
            float k = (t - atk) / Mathf.Max(0.0001f, dur - atk);
            return Mathf.Exp(-5.2f * k);
        }

        /// <summary>Cộng một nốt (có thể quét tần số) vào bộ đệm.</summary>
        public static void Tone(float[] buf, float delay, float f0, float f1, float dur,
                                Wave w = Wave.Square, float vol = .3f, bool expSweep = true,
                                float atk = .004f, float lp0 = 0f, float lp1 = 0f)
        {
            int start = Mathf.Clamp(Mathf.RoundToInt(delay * SR), 0, buf.Length);
            int n = Mathf.Min(buf.Length - start, Mathf.RoundToInt(dur * SR));
            if (n <= 0) return;

            uint rng = 22222u;
            float phase = 0f, lpState = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                float k = t / dur;
                float f = f1 <= 0f ? f0
                        : (expSweep ? f0 * Mathf.Pow(Mathf.Max(1f, f1) / Mathf.Max(1f, f0), k)
                                    : Mathf.Lerp(f0, f1, k));
                phase += M.TAU * f / SR;
                if (phase > M.TAU * 1024f) phase -= M.TAU * 1024f;

                float s = Osc(w, phase, ref rng) * Env(t, dur, atk) * vol;

                if (lp0 > 0f)
                {
                    float fc = lp1 > 0f ? Mathf.Lerp(lp0, lp1, k) : lp0;
                    float a = 1f - Mathf.Exp(-M.TAU * Mathf.Clamp(fc, 30f, SR * 0.45f) / SR);
                    lpState += a * (s - lpState);
                    s = lpState;
                }
                buf[start + i] += s;
            }
        }

        /// <summary>Cộng một cú nhiễu có lọc (tiếng nổ, tiếng bắn, trống).</summary>
        public static void NoiseHit(float[] buf, float delay, float f0, float f1, float dur,
                                    float vol = .3f, float q = 1.2f, string type = "band")
        {
            int start = Mathf.Clamp(Mathf.RoundToInt(delay * SR), 0, buf.Length);
            int n = Mathf.Min(buf.Length - start, Mathf.RoundToInt(dur * SR));
            if (n <= 0) return;

            uint rng = (uint)UnityEngine.Random.Range(1, int.MaxValue);
            float low = 0f, band = 0f;
            float qc = 1f / Mathf.Max(0.35f, q);

            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                float k = t / dur;
                float fc = f1 > 0f ? f0 * Mathf.Pow(Mathf.Max(20f, f1) / Mathf.Max(20f, f0), k) : f0;
                fc = Mathf.Clamp(fc, 25f, SR / 6.2f);

                rng = rng * 1664525u + 1013904223u;
                float x = ((rng >> 8) & 0xFFFF) / 32768f - 1f;

                // bộ lọc biến trạng thái (Chamberlin)
                float f = 2f * Mathf.Sin(Mathf.PI * fc / SR);
                low += f * band;
                float high = x - low - qc * band;
                band += f * high;

                float s = type == "high" ? high : (type == "low" ? low : band);
                buf[start + i] += s * Env(t, dur, .002f) * vol;
            }
        }

        public static AudioClip ToClip(float[] buf, string name)
        {
            // chống méo tiếng
            float peak = 0f;
            for (int i = 0; i < buf.Length; i++) { float a = Mathf.Abs(buf[i]); if (a > peak) peak = a; }
            if (peak > 1f) { float inv = 0.99f / peak; for (int i = 0; i < buf.Length; i++) buf[i] *= inv; }

            var c = AudioClip.Create(name, buf.Length, 1, SR, false);
            c.SetData(buf, 0);
            return c;
        }
    }
}
