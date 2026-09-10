// ============================================================
//  NEON HORDE — tự cấu hình project lần đầu mở
//  Tạo scene, đưa vào Build Settings, đặt tên game & hướng màn hình.
//  Chạy đúng MỘT lần; muốn chạy lại: menu  Neon Horde > Thiết lập lại project
// ============================================================
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace NH.EditorTools
{
    [InitializeOnLoad]
    public static class NHSetup
    {
        const string ScenePath = "Assets/Scenes/Game.unity";
        const string DoneKey = "NH.setupDone.v1";

        static NHSetup()
        {
            if (SessionState.GetBool("NH.setupChecked", false)) return;
            SessionState.SetBool("NH.setupChecked", true);
            EditorApplication.delayCall += () => { if (!EditorPrefs.GetBool(DoneKey, false)) Run(false); };
        }

        [MenuItem("Neon Horde/Thiết lập lại project", false, 1)]
        static void RunFromMenu() => Run(true);

        /// <summary>Gọi được từ dòng lệnh: Unity.exe -executeMethod NH.EditorTools.NHSetup.SetupNow</summary>
        public static void SetupNow() => Run(true);

        static void Run(bool force)
        {
            EnsureShadersIncluded();
            EnsureScene(force);
            ApplyPlayerSettings();
            EditorPrefs.SetBool(DoneKey, true);
            Debug.Log("[Neon Horde] Đã thiết lập xong. Bấm Play để chơi.");
        }

        /// <summary>
        /// Unity chỉ đóng gói shader nào được asset tham chiếu. Game này tìm shader
        /// bằng Shader.Find lúc chạy nên phải khai báo "Always Included", không thì
        /// bản build sẽ mất nền lưới và hiệu ứng phát sáng.
        /// </summary>
        static void EnsureShadersIncluded()
        {
            string[] want = { "NeonHorde/Additive", "Sprites/Default" };

            var gsAsset = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset");
            if (gsAsset == null || gsAsset.Length == 0) { Debug.LogWarning("[Neon Horde] Không đọc được GraphicsSettings."); return; }

            var so = new SerializedObject(gsAsset[0]);
            var arr = so.FindProperty("m_AlwaysIncludedShaders");
            if (arr == null) return;

            foreach (var name in want)
            {
                var sh = Shader.Find(name);
                if (sh == null) { Debug.LogWarning("[Neon Horde] Không tìm thấy shader: " + name); continue; }

                bool has = false;
                for (int i = 0; i < arr.arraySize; i++)
                    if (arr.GetArrayElementAtIndex(i).objectReferenceValue == sh) { has = true; break; }
                if (has) continue;

                arr.InsertArrayElementAtIndex(arr.arraySize);
                arr.GetArrayElementAtIndex(arr.arraySize - 1).objectReferenceValue = sh;
                Debug.Log("[Neon Horde] Thêm shader vào Always Included: " + name);
            }
            so.ApplyModifiedProperties();
            AssetDatabase.SaveAssets();
        }

        static void EnsureScene(bool force)
        {
            if (!force && File.Exists(ScenePath)) return;

            Directory.CreateDirectory("Assets/Scenes");

            var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);

            // Game tự dựng mọi thứ lúc chạy nên scene chỉ cần camera.
            foreach (var go in scene.GetRootGameObjects())
            {
                if (go.GetComponent<Light>() != null) Object.DestroyImmediate(go);
            }

            var camGo = Camera.main != null ? Camera.main.gameObject : new GameObject("Main Camera");
            if (camGo.GetComponent<Camera>() == null) camGo.AddComponent<Camera>();
            var cam = camGo.GetComponent<Camera>();
            cam.orthographic = true;
            cam.orthographicSize = 470f;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(6 / 255f, 7 / 255f, 13 / 255f);
            cam.nearClipPlane = -100f;
            cam.farClipPlane = 100f;
            camGo.tag = "MainCamera";
            camGo.transform.position = new Vector3(0, 0, -10f);

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }

        static void ApplyPlayerSettings()
        {
            PlayerSettings.companyName = "MoodBoost";
            PlayerSettings.productName = "Neon Horde";

            // dọc & ngang đều chơi được
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
            PlayerSettings.allowedAutorotateToPortrait = true;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;

            PlayerSettings.defaultScreenWidth = 1280;
            PlayerSettings.defaultScreenHeight = 720;
            PlayerSettings.runInBackground = false;

            try
            {
                PlayerSettings.SetApplicationIdentifier(
                    NamedBuildTarget.Android, "com.moodboost.neonhorde");
            }
            catch { /* nền tảng chưa cài — bỏ qua */ }
        }
    }
}
