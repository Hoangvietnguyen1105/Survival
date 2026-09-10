// ============================================================
//  NEON HORDE — kiểm thử & đóng gói (gọi từ menu hoặc dòng lệnh)
// ============================================================
using System;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace NH.EditorTools
{
    public static class NHBuild
    {
        // =========================================================
        //  Kiểm thử phần sinh ảnh & dữ liệu (không cần vào Play)
        // =========================================================
        [MenuItem("Neon Horde/Kiểm tra ảnh + dữ liệu", false, 20)]
        public static void AssetSmoke()
        {
            int n = 0;
            var keys = new System.Collections.Generic.List<string>
            {
                "glow","spark","shadow","px","ring","vignette","gridcell",
                "e_grunt","e_swarm","e_tank","e_shooter","e_splitter","e_charger","e_bomber","e_orbiter",
                "e_boss","e_boss2","e_boss3",
                "b_basic","b_pellet","b_missile","b_bomb","b_blade","b_frost","b_enemy","b_shard","b_orb",
                "p_xp1","p_xp2","p_xp3","p_coin","p_heart","p_magnet","p_nuke","p_chest",
            };
            foreach (var c in GameData.Characters) keys.Add(c.Sprite);
            foreach (var id in GameData.WeaponIds) keys.Add("w_" + id);
            foreach (var id in GameData.PassiveIds) keys.Add("i_" + id);

            var t0 = DateTime.Now;
            foreach (var k in keys)
            {
                var sp = Art.Get(k);
                if (sp == null || sp.texture == null) throw new Exception("Sprite hỏng: " + k);
                n++;
            }
            double bakeMs = (DateTime.Now - t0).TotalMilliseconds;

            // dữ liệu: chạy hết mọi cấp của mọi vũ khí / trang bị
            foreach (var id in GameData.WeaponIds)
            {
                var d = GameData.Weapons[id];
                for (int lv = 1; lv <= d.Max; lv++)
                {
                    var st = d.Stat(lv);
                    var desc = d.Desc(lv);
                    if (string.IsNullOrEmpty(desc)) throw new Exception("Mô tả rỗng: " + id + " lv" + lv);
                    if (!d.Continuous && st.cd <= 0f)
                        Debug.LogWarning($"[NH] {id} cấp {lv} có hồi chiêu <= 0 ({st.cd:0.###})");
                }
            }
            foreach (var id in GameData.PassiveIds)
            {
                var d = GameData.Passives[id];
                for (int lv = 1; lv <= d.Max; lv++)
                {
                    var s = Stats.Base();
                    d.Apply(s, lv);
                    if (string.IsNullOrEmpty(d.Desc(lv))) throw new Exception("Mô tả rỗng: " + id);
                }
            }
            foreach (var c in GameData.Characters)
            {
                var s = Stats.Base();
                c.Apply(s);
                if (s.maxHp <= 0f) throw new Exception("Nhân vật máu <= 0: " + c.Id);
                if (!GameData.Weapons.ContainsKey(c.Weapon)) throw new Exception("Vũ khí không tồn tại: " + c.Weapon);
            }

            Debug.Log($"[NH] KIỂM TRA OK — {n} sprite ({bakeMs:0} ms), " +
                      $"{GameData.WeaponIds.Count} vũ khí, {GameData.PassiveIds.Count} trang bị, " +
                      $"{GameData.Characters.Count} nhân vật, {GameData.Enemies.Count} loại quái.");
        }

        // =========================================================
        //  Đóng gói
        // =========================================================
        static string[] Scenes => EditorBuildSettings.scenes
            .Where(s => s.enabled).Select(s => s.path).ToArray();

        [MenuItem("Neon Horde/Build Windows", false, 40)]
        public static void BuildWindows()
        {
            string dir = GetArg("-nhout") ?? "Build/Windows";
            var opt = new BuildPlayerOptions
            {
                scenes = Scenes,
                locationPathName = System.IO.Path.Combine(dir, "NeonHorde.exe"),
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None
            };
            Report(BuildPipeline.BuildPlayer(opt), "Windows");
        }

        [MenuItem("Neon Horde/Build Android (APK)", false, 41)]
        public static void BuildAndroid()
        {
            PlayerSettings.SetApplicationIdentifier(
                UnityEditor.Build.NamedBuildTarget.Android, "com.moodboost.neonhorde");
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;

            var opt = new BuildPlayerOptions
            {
                scenes = Scenes,
                locationPathName = "Build/Android/NeonHorde.apk",
                target = BuildTarget.Android,
                options = BuildOptions.None
            };
            Report(BuildPipeline.BuildPlayer(opt), "Android");
        }

        [MenuItem("Neon Horde/Build WebGL", false, 42)]
        public static void BuildWebGL()
        {
            var opt = new BuildPlayerOptions
            {
                scenes = Scenes,
                locationPathName = "Build/WebGL",
                target = BuildTarget.WebGL,
                options = BuildOptions.None
            };
            Report(BuildPipeline.BuildPlayer(opt), "WebGL");
        }

        static void Report(BuildReport r, string label)
        {
            var s = r.summary;
            if (s.result == BuildResult.Succeeded)
                Debug.Log($"[NH] BUILD {label} THÀNH CÔNG -> {s.outputPath} ({s.totalSize / 1048576f:0.0} MB)");
            else
                Debug.LogError($"[NH] BUILD {label} THẤT BẠI: {s.result}, {s.totalErrors} lỗi");
        }

        static string GetArg(string name)
        {
            var a = Environment.GetCommandLineArgs();
            for (int i = 0; i < a.Length - 1; i++) if (a[i] == name) return a[i + 1];
            return null;
        }
    }
}
