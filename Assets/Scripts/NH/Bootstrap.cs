// ============================================================
//  NEON HORDE — điểm khởi động
//  Game tự dựng toàn bộ khi bấm Play, ở BẤT KỲ scene nào.
//  Không cần kéo thả prefab hay gắn script vào object nào cả.
// ============================================================
using UnityEngine;

namespace NH
{
    public static class Bootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (GameCtrl.I != null) return;

            var go = new GameObject("~NeonHorde");
            Object.DontDestroyOnLoad(go);

            go.AddComponent<GameCtrl>();     // Awake dựng camera, thế giới, âm thanh
            go.AddComponent<UIRoot>();       // Awake dựng toàn bộ giao diện

            Screen.sleepTimeout = SleepTimeout.NeverSleep;
        }
    }
}
