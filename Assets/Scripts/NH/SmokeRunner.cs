// ============================================================
//  NEON HORDE — chế độ tự chơi để kiểm thử
//  Chỉ bật khi chạy game với tham số dòng lệnh  -nhsmoke
//  Dùng để xác minh game chạy thật mà không cần người ngồi bấm.
// ============================================================
using System.Linq;
using UnityEngine;

namespace NH
{
    public class SmokeRunner : MonoBehaviour
    {
        public static bool Enabled;
        public static float Duration = 60f;
        public static string ShotPath;

        float t;
        bool started;
        int levelUps, shots;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Hook()
        {
            var args = System.Environment.GetCommandLineArgs();
            if (!args.Any(a => a == "-nhsmoke")) return;

            Enabled = true;
            for (int i = 0; i < args.Length - 1; i++)
            {
                if (args[i] == "-nhduration") float.TryParse(args[i + 1], out Duration);
                if (args[i] == "-nhshot") ShotPath = args[i + 1];
            }

            var go = new GameObject("~Smoke");
            DontDestroyOnLoad(go);
            go.AddComponent<SmokeRunner>();
            Debug.Log("[SMOKE] bật, chạy " + Duration + "s");
        }

        void Start()
        {
            Time.timeScale = 5f;              // GameCtrl kẹp dt ở 0.05 nên thực tế nhanh ~3x
            Application.targetFrameRate = -1;
        }

        void Update()
        {
            var G = GameCtrl.I;
            if (G == null) return;

            t += Time.unscaledDeltaTime;

            if (!started && t > 1f)
            {
                started = true;
                UIRoot.I.StartRun();
                Debug.Log("[SMOKE] bắt đầu ván");
            }

            if (G.State == GState.LevelUp)
            {
                levelUps++;
                UIRoot.I.SmokePickFirst();
            }

            // né kẻ địch gần nhất, không dạt ra rìa bản đồ
            if (G.State == GState.Playing && G.Player != null)
            {
                Vector2 f = Vector2.zero;
                var list = G.Enemies.Active;
                for (int i = 0; i < list.Count; i++)
                {
                    var e = list[i];
                    float d = Vector2.Distance(e.pos, G.Player.pos);
                    if (d < 260f && d > 1f) f -= (e.pos - G.Player.pos) / d * ((260f - d) / 260f);
                }
                float dc = G.Player.pos.magnitude;
                if (dc > 1000f) f -= G.Player.pos / dc * 2.5f;
                if (f.sqrMagnitude < .01f) f = new Vector2(Mathf.Cos(t), Mathf.Sin(t * 1.3f));

                InputCtrl.ForceInput = true;
                InputCtrl.ForcedMove = f.normalized;

                if (Mathf.Repeat(t, 3f) < Time.unscaledDeltaTime) InputCtrl.QueueDash();
            }

            // chụp màn hình ở 3 mốc
            if (ShotPath != null && started && shots < 3 && t > 12f + shots * 16f)
            {
                ScreenCapture.CaptureScreenshot(ShotPath.Replace(".png", "_" + shots + ".png"));
                shots++;
            }

            if (t > Duration)
            {
                Debug.Log($"[SMOKE] XONG state={G.State} wave={G.Wave} kills={G.Kills} " +
                          $"lvlups={levelUps} enemies={G.Enemies.Count} " +
                          $"weapons={string.Join(",", G.Weapons.Select(w => w.id + ":" + w.lv + (w.evolved ? "*" : "")))} " +
                          $"passives={string.Join(",", G.Passives.Select(p => p.id + ":" + p.lv))} " +
                          $"dmg={Mathf.Round(G.DmgDealt)}");
                Application.Quit(0);
            }
        }
    }
}
