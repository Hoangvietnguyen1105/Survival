// ============================================================
//  NEON HORDE — giao diện, dựng hoàn toàn bằng code (uGUI)
//  Không prefab, không phải kéo thả gì trong Editor.
// ============================================================
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace NH
{
    public class UIRoot : MonoBehaviour
    {
        public static UIRoot I;

        static Font font;
        Canvas canvas;
        Transform cv;                    // root cho mọi thứ

        // ---- HUD ----
        GameObject hud;
        Image hpFill, xpFill, bossFill, hurtVig, flashImg, vignette, sigilTint;
        Text hpText, xpText, waveText, timerText, killText, goldText, bossName, announceText;
        RectTransform weaponRow, passiveRow, sigilRow;
        GameObject bossBar, bossRuleGo;
        Text bossRuleText;
        float announceT;

        // ---- màn hình ----
        GameObject menu, howto, levelup, pauseScr, gameover, touchLayer;
        RectTransform stickBase, stickKnob;
        GameObject dashBtn;
        Transform charList, cardRow;
        Text charDesc, bestText, muteText, goTitle, resultText, lvlTitle;
        Button rerollBtn; Text rerollText;
        Transform statPanel;
        Text statText;

        string selectedChar = "ranger";
        List<Offer> offers = new List<Offer>();
        int freeRerolls;

        // paleta
        static readonly Color BG = new Color(10 / 255f, 13 / 255f, 24 / 255f, .93f);
        static readonly Color DIM = new Color(123 / 255f, 134 / 255f, 168 / 255f);
        static readonly Color TXT = new Color(223 / 255f, 231 / 255f, 255 / 255f);
        static readonly Color LINE = new Color(120 / 255f, 160 / 255f, 255 / 255f, .22f);

        // =========================================================
        void Awake()
        {
            I = this;
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (font == null) font = Resources.GetBuiltinResource<Font>("Arial.ttf");

            BuildCanvas();
            BuildHud();
            BuildTouch();
            BuildMenu();
            BuildHowto();
            BuildLevelUp();
            BuildPause();
            BuildGameOver();

            ShowOnly(menu);
        }

        // =========================================================
        //  BỘ DỰNG GIAO DIỆN
        // =========================================================
        static GameObject Node(string name, Transform parent)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        static RectTransform Rt(GameObject go) => (RectTransform)go.transform;

        static RectTransform Stretch(GameObject go, float l = 0, float r = 0, float t = 0, float b = 0)
        {
            var rt = Rt(go);
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(l, b); rt.offsetMax = new Vector2(-r, -t);
            return rt;
        }

        static RectTransform Anchor(GameObject go, Vector2 anchor, Vector2 pivot, Vector2 pos, Vector2 size)
        {
            var rt = Rt(go);
            rt.anchorMin = rt.anchorMax = anchor;
            rt.pivot = pivot;
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;
            return rt;
        }

        static Image Img(string name, Transform p, Color c, Sprite sp = null)
        {
            var go = Node(name, p);
            var im = go.AddComponent<Image>();
            im.color = c;
            if (sp != null) im.sprite = sp;
            im.raycastTarget = false;
            return im;
        }

        static Text Txt(string name, Transform p, string s, int size, Color c,
                        TextAnchor anchor = TextAnchor.MiddleCenter, FontStyle style = FontStyle.Bold)
        {
            var go = Node(name, p);
            var t = go.AddComponent<Text>();
            t.font = font; t.text = s; t.fontSize = size; t.color = c;
            t.alignment = anchor; t.fontStyle = style;
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false;
            t.supportRichText = true;
            return t;
        }

        static Button Btn(string name, Transform p, string label, int size, Color accent,
                          Vector2 sizeDelta, UnityEngine.Events.UnityAction onClick)
        {
            var go = Node(name, p);
            var im = go.AddComponent<Image>();
            im.color = new Color(accent.r, accent.g, accent.b, .16f);
            var b = go.AddComponent<Button>();
            b.targetGraphic = im;
            var cb = b.colors;
            cb.normalColor = Color.white;
            cb.highlightedColor = new Color(1.25f, 1.25f, 1.25f);
            cb.pressedColor = new Color(.75f, .75f, .75f);
            b.colors = cb;
            b.onClick.AddListener(() => { Sfx.Play("select", .6f); onClick(); });
            Rt(go).sizeDelta = sizeDelta;

            var ol = go.AddComponent<Outline>();
            ol.effectColor = new Color(accent.r, accent.g, accent.b, .8f);
            ol.effectDistance = new Vector2(1.4f, 1.4f);

            var t = Txt("label", go.transform, label, size, Color.white);
            Stretch(t.gameObject);
            return b;
        }

        void BuildCanvas()
        {
            var go = new GameObject("~UI");
            go.transform.SetParent(transform, false);
            canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;

            var sc = go.AddComponent<CanvasScaler>();
            sc.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            sc.referenceResolution = new Vector2(1280, 720);
            sc.screenMatchMode = CanvasScaler.ScreenMatchMode.Expand;

            go.AddComponent<GraphicRaycaster>();
            cv = go.transform;

            if (FindAnyObjectByType<EventSystem>() == null)
            {
                var es = new GameObject("~EventSystem");
                es.transform.SetParent(transform, false);
                es.AddComponent<EventSystem>();
                es.AddComponent<StandaloneInputModule>();
            }
        }

        // =========================================================
        //  HUD
        // =========================================================
        void BuildHud()
        {
            hud = Node("HUD", cv);
            Stretch(hud);

            // ---- lớp phủ toàn màn hình ----
            vignette = Img("vignette", hud.transform, new Color(1, 1, 1, .85f), Art.Get("vignette"));
            Stretch(vignette.gameObject);
            vignette.transform.SetAsFirstSibling();

            hurtVig = Img("hurt", hud.transform, new Color(1, .12f, .25f, 0f), Art.Get("vignette"));
            Stretch(hurtVig.gameObject);

            flashImg = Img("flash", hud.transform, new Color(1, 1, 1, 0f));
            Stretch(flashImg.gameObject);

            // lớp phủ của Ấn Ký: xanh băng khi ĐÓNG BĂNG, đỏ khi HÀNH QUYẾT
            sigilTint = Img("sigilTint", hud.transform, new Color(1, 1, 1, 0f));
            Stretch(sigilTint.gameObject);

            // ---- thanh máu / kinh nghiệm ----
            var bars = Node("bars", hud.transform);
            Anchor(bars, new Vector2(0, 1), new Vector2(0, 1), new Vector2(14, -12), new Vector2(330, 46));

            var hpBg = Img("hpbg", bars.transform, new Color(0, 0, 0, .55f));
            Anchor(hpBg.gameObject, new Vector2(0, 1), new Vector2(0, 1), Vector2.zero, new Vector2(330, 22));
            hpFill = Img("hpfill", hpBg.transform, new Color(1f, .18f, .33f));
            Stretch(hpFill.gameObject, 2, 2, 2, 2);
            hpFill.type = Image.Type.Filled;
            hpFill.fillMethod = Image.FillMethod.Horizontal;
            hpFill.sprite = Art.Get("px");
            hpText = Txt("hptext", hpBg.transform, "100/100", 13, Color.white);
            Stretch(hpText.gameObject);

            var xpBg = Img("xpbg", bars.transform, new Color(0, 0, 0, .55f));
            Anchor(xpBg.gameObject, new Vector2(0, 1), new Vector2(0, 1), new Vector2(0, -26), new Vector2(330, 15));
            xpFill = Img("xpfill", xpBg.transform, Art.Cyan);
            Stretch(xpFill.gameObject, 2, 2, 2, 2);
            xpFill.type = Image.Type.Filled;
            xpFill.fillMethod = Image.FillMethod.Horizontal;
            xpFill.sprite = Art.Get("px");
            xpText = Txt("xptext", xpBg.transform, "Lv.1", 11, Color.white);
            Stretch(xpText.gameObject);

            // ---- màn & đồng hồ ----
            var wbox = Node("wavebox", hud.transform);
            Anchor(wbox, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -10), new Vector2(240, 62));
            waveText = Txt("wave", wbox.transform, "MÀN 1", 14, DIM);
            Anchor(waveText.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, 0), new Vector2(240, 20));
            timerText = Txt("timer", wbox.transform, "0:30", 34, Color.white);
            Anchor(timerText.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -20), new Vector2(240, 40));

            // ---- thống kê nhỏ ----
            killText = Txt("kills", hud.transform, "0", 16, TXT, TextAnchor.MiddleRight);
            Anchor(killText.gameObject, new Vector2(1, 1), new Vector2(1, 1), new Vector2(-70, -14), new Vector2(120, 22));
            goldText = Txt("gold", hud.transform, "0", 16, Art.Gold, TextAnchor.MiddleRight);
            Anchor(goldText.gameObject, new Vector2(1, 1), new Vector2(1, 1), new Vector2(-70, -38), new Vector2(120, 22));

            // ---- nút tạm dừng ----
            var pb = Btn("pause", hud.transform, "II", 18, Art.Cyan, new Vector2(46, 46), TogglePause);
            Anchor(pb.gameObject, new Vector2(1, 1), new Vector2(1, 1), new Vector2(-12, -12), new Vector2(46, 46));

            // ---- thanh máu trùm ----
            bossBar = Node("bossbar", hud.transform);
            Anchor(bossBar, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -84), new Vector2(440, 34));
            bossName = Txt("bossname", bossBar.transform, "TRÙM", 13, Art.Red);
            Anchor(bossName.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), Vector2.zero, new Vector2(440, 16));
            var bbg = Img("bbg", bossBar.transform, new Color(0, 0, 0, .7f));
            Anchor(bbg.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -17), new Vector2(440, 14));
            bossFill = Img("bfill", bbg.transform, new Color(1f, .18f, .33f));
            Stretch(bossFill.gameObject, 2, 2, 2, 2);
            bossFill.type = Image.Type.Filled;
            bossFill.fillMethod = Image.FillMethod.Horizontal;
            bossFill.sprite = Art.Get("px");

            /* huy hiệu LUẬT ĐẤU TRƯỜNG — ngay dưới thanh máu trùm.
               Con trùm nào cũng bẻ cong cách chơi theo một kiểu riêng; nếu không ghi
               rõ ra thì người chơi chỉ thấy "sao tự nhiên chậm/không lướt được" và
               tưởng game hỏng. Chữ phải nằm ngoài bossBar? Không — để trong bossBar
               để bật/tắt cùng nhau, riêng luật thì ẩn thêm bằng bossRuleGo. */
            bossRuleGo = Node("bossrule", bossBar.transform);
            Anchor(bossRuleGo, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -34), new Vector2(440, 15));
            bossRuleText = Txt("bossruletext", bossRuleGo.transform, "", 11, Color.white);
            Anchor(bossRuleText.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), Vector2.zero, new Vector2(440, 15));
            bossRuleGo.SetActive(false);

            bossBar.SetActive(false);

            // ---- ô vũ khí / trang bị ----
            weaponRow = MakeRow("weapons", hud.transform, new Vector2(14, 60), 46);
            passiveRow = MakeRow("passives", hud.transform, new Vector2(14, 52), 34);
            sigilRow   = MakeRow("sigils",   hud.transform, new Vector2(14, 14), 34);

            // ---- chữ thông báo giữa màn ----
            announceText = Txt("announce", hud.transform, "", 54, Color.white);
            Anchor(announceText.gameObject, new Vector2(.5f, .5f), new Vector2(.5f, .5f), new Vector2(0, 120), new Vector2(900, 80));
            announceText.gameObject.SetActive(false);

            hud.SetActive(false);
        }

        RectTransform MakeRow(string name, Transform p, Vector2 pos, float cell)
        {
            var go = Node(name, p);
            var rt = Anchor(go, new Vector2(0, 0), new Vector2(0, 0), pos, new Vector2(600, cell));
            var lay = go.AddComponent<HorizontalLayoutGroup>();
            lay.spacing = 5f;
            lay.childAlignment = TextAnchor.LowerLeft;
            lay.childControlWidth = false; lay.childControlHeight = false;
            lay.childForceExpandWidth = false; lay.childForceExpandHeight = false;
            return rt;
        }

        // =========================================================
        //  CẢM ỨNG
        // =========================================================
        void BuildTouch()
        {
            touchLayer = Node("Touch", cv);
            Stretch(touchLayer);

            var b = Img("stickBase", touchLayer.transform, new Color(Art.Cyan.r, Art.Cyan.g, Art.Cyan.b, .18f), Art.Get("ring"));
            stickBase = Anchor(b.gameObject, new Vector2(0, 0), new Vector2(.5f, .5f), Vector2.zero, new Vector2(150, 150));
            var k = Img("stickKnob", touchLayer.transform, new Color(Art.Cyan.r, Art.Cyan.g, Art.Cyan.b, .85f), Art.Get("glow"));
            stickKnob = Anchor(k.gameObject, new Vector2(0, 0), new Vector2(.5f, .5f), Vector2.zero, new Vector2(78, 78));
            b.gameObject.SetActive(false);
            k.gameObject.SetActive(false);

            var db = Btn("dash", touchLayer.transform, "DASH", 18, Art.Mag, new Vector2(104, 104), InputCtrl.QueueDash);
            Anchor(db.gameObject, new Vector2(1, 0), new Vector2(1, 0), new Vector2(-28, 40), new Vector2(104, 104));
            dashBtn = db.gameObject;

            touchLayer.SetActive(false);
        }

        // =========================================================
        //  MENU
        // =========================================================
        void BuildMenu()
        {
            menu = MakeScreen("Menu");

            var title = Txt("title", menu.transform, "NEON HORDE", 84, Color.white);
            Anchor(title.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -50), new Vector2(1100, 100));
            var ol = title.gameObject.AddComponent<Outline>();
            ol.effectColor = new Color(Art.Cyan.r, Art.Cyan.g, Art.Cyan.b, .9f);
            ol.effectDistance = new Vector2(3f, 3f);

            var sub = Txt("sub", menu.transform, "Sống sót giữa bầy quái  ·  Roguelike Survivor", 16, DIM);
            Anchor(sub.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -152), new Vector2(900, 26));

            var lbl = Txt("lbl", menu.transform, "CHỌN NHÂN VẬT", 13, DIM);
            Anchor(lbl.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -196), new Vector2(600, 20));

            var listGo = Node("charList", menu.transform);
            Anchor(listGo, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -220), new Vector2(760, 132));
            var lay = listGo.AddComponent<HorizontalLayoutGroup>();
            lay.spacing = 12f; lay.childAlignment = TextAnchor.MiddleCenter;
            lay.childControlWidth = false; lay.childControlHeight = false;
            lay.childForceExpandWidth = false; lay.childForceExpandHeight = false;
            charList = listGo.transform;

            charDesc = Txt("desc", menu.transform, "", 15, DIM);
            Anchor(charDesc.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -364), new Vector2(860, 76));

            var play = Btn("play", menu.transform, "BẮT ĐẦU", 26, Art.Cyan, new Vector2(300, 66),
                           () => StartRun());
            Anchor(play.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 130), new Vector2(300, 66));

            var howBtn = Btn("how", menu.transform, "Hướng dẫn", 16, DIM, new Vector2(170, 46),
                             () => ShowOnly(howto));
            Anchor(howBtn.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(-92, 70), new Vector2(170, 46));

            var mute = Btn("mute", menu.transform, "", 16, DIM, new Vector2(190, 46), ToggleMute);
            Anchor(mute.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(96, 70), new Vector2(190, 46));
            muteText = mute.GetComponentInChildren<Text>();

            bestText = Txt("best", menu.transform, "", 14, DIM);
            Anchor(bestText.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 28), new Vector2(500, 22));

            BuildCharCards();
            RefreshMenuTexts();
        }

        void BuildCharCards()
        {
            foreach (var ch in GameData.Characters)
            {
                var card = Node("char_" + ch.Id, charList);
                Rt(card).sizeDelta = new Vector2(126, 132);
                var bg = card.AddComponent<Image>();
                bg.color = new Color(1, 1, 1, .04f);

                var btn = card.AddComponent<Button>();
                btn.targetGraphic = bg;
                string id = ch.Id;
                btn.onClick.AddListener(() => { Sfx.Play("select", .6f); SelectChar(id); });

                var ol = card.AddComponent<Outline>();
                ol.effectColor = LINE;
                ol.effectDistance = new Vector2(1.2f, 1.2f);

                var icon = Img("icon", card.transform, Color.white, Art.Get(ch.Sprite));
                Anchor(icon.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -8), new Vector2(64, 64));

                var nm = Txt("n", card.transform, ch.Name, 15, TXT);
                Anchor(nm.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 32), new Vector2(126, 22));
                var rl = Txt("r", card.transform, ch.Role, 11, DIM);
                Anchor(rl.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 12), new Vector2(126, 18));
            }
            SelectChar(selectedChar);
        }

        void SelectChar(string id)
        {
            selectedChar = id;
            for (int i = 0; i < GameData.Characters.Count; i++)
            {
                var ch = GameData.Characters[i];
                var card = charList.Find("char_" + ch.Id);
                if (card == null) continue;
                bool sel = ch.Id == id;
                card.GetComponent<Image>().color = sel
                    ? new Color(Art.Cyan.r, Art.Cyan.g, Art.Cyan.b, .16f)
                    : new Color(1, 1, 1, .04f);
                card.GetComponent<Outline>().effectColor = sel ? Art.Cyan : LINE;
            }
            var c = GameData.Char(id);
            charDesc.text = c.Desc
                + "\n<color=#b6ff3a>" + c.ModText + "</color>"
                + "\n<color=#25f4ee>Vũ khí khởi đầu: " + GameData.Weapons[c.Weapon].Name + "</color>";
        }

        void RefreshMenuTexts()
        {
            bestText.text = "Kỷ lục: <color=#ffc93c>Màn " + SaveData.Best + "</color>";
            if (muteText != null) muteText.text = "Âm thanh: " + (Sfx.Muted ? "TẮT" : "BẬT");
        }

        // =========================================================
        //  HƯỚNG DẪN
        // =========================================================
        void BuildHowto()
        {
            howto = MakeScreen("Howto");
            var t = Txt("title", howto.transform, "HƯỚNG DẪN", 34, Color.white);
            Anchor(t.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -60), new Vector2(700, 44));

            string body =
                "<color=#ffffff><b>Di chuyển</b></color>   WASD / phím mũi tên · chạm & kéo trên điện thoại\n\n" +
                "<color=#ffffff><b>Tấn công</b></color>   Tự động! Vũ khí tự bắn kẻ địch gần nhất. Bạn chỉ cần né.\n\n" +
                "<color=#ffffff><b>Lướt (Dash)</b></color>   Space / Shift · nút DASH — miễn thương khi lướt\n\n" +
                "<color=#ffffff><b>Ngọc kinh nghiệm</b></color>   Nhặt để lên cấp và chọn nâng cấp\n\n" +
                "<color=#ffffff><b>Tiến hoá vũ khí</b></color>   Vũ khí cấp TỐI ĐA + trang bị đi kèm cấp 3\n\n" +
                "<color=#ffffff><b>Trùm</b></color>   Mỗi 5 màn. Hạ trùm để nhận rương báu.\n\n" +
                "<color=#ffffff><b>Tạm dừng</b></color>   ESC / nút II góc phải";

            var b = Txt("body", howto.transform, body, 17, DIM, TextAnchor.UpperLeft, FontStyle.Normal);
            Anchor(b.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -120), new Vector2(700, 400));

            var back = Btn("back", howto.transform, "QUAY LẠI", 18, Art.Cyan, new Vector2(210, 52), () => ShowOnly(menu));
            Anchor(back.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 60), new Vector2(210, 52));
            howto.SetActive(false);
        }

        // =========================================================
        //  LÊN CẤP
        // =========================================================
        void BuildLevelUp()
        {
            levelup = MakeScreen("LevelUp");
            lvlTitle = Txt("title", levelup.transform, "LÊN CẤP!", 40, Color.white);
            Anchor(lvlTitle.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -60), new Vector2(700, 50));
            var sub = Txt("sub", levelup.transform, "Chọn một nâng cấp", 16, DIM);
            Anchor(sub.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -104), new Vector2(700, 24));

            var row = Node("cards", levelup.transform);
            Anchor(row, new Vector2(.5f, .5f), new Vector2(.5f, .5f), new Vector2(0, 0), new Vector2(1000, 330));
            var lay = row.AddComponent<HorizontalLayoutGroup>();
            lay.spacing = 16f; lay.childAlignment = TextAnchor.MiddleCenter;
            lay.childControlWidth = false; lay.childControlHeight = false;
            lay.childForceExpandWidth = false; lay.childForceExpandHeight = false;
            cardRow = row.transform;

            var rb = Btn("reroll", levelup.transform, "", 15, DIM, new Vector2(240, 44), Reroll);
            Anchor(rb.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 60), new Vector2(240, 44));
            rerollBtn = rb;
            rerollText = rb.GetComponentInChildren<Text>();

            levelup.SetActive(false);
        }

        // =========================================================
        //  TẠM DỪNG
        // =========================================================
        void BuildPause()
        {
            pauseScr = MakeScreen("Pause");
            var t = Txt("title", pauseScr.transform, "TẠM DỪNG", 36, Color.white);
            Anchor(t.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -60), new Vector2(700, 46));

            statText = Txt("stats", pauseScr.transform, "", 16, DIM, TextAnchor.UpperLeft, FontStyle.Normal);
            Anchor(statText.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -120), new Vector2(700, 360));
            statPanel = statText.transform;

            var res = Btn("resume", pauseScr.transform, "TIẾP TỤC", 20, Art.Cyan, new Vector2(240, 56), TogglePause);
            Anchor(res.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 118), new Vector2(240, 56));

            var quit = Btn("quit", pauseScr.transform, "Bỏ cuộc", 16, Art.Red, new Vector2(190, 46),
                           () => { GameCtrl.I.QuitToMenu(); ShowOnly(menu); RefreshMenuTexts(); });
            Anchor(quit.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 60), new Vector2(190, 46));

            pauseScr.SetActive(false);
        }

        // =========================================================
        //  KẾT THÚC
        // =========================================================
        void BuildGameOver()
        {
            gameover = MakeScreen("GameOver");
            goTitle = Txt("title", gameover.transform, "BẠN ĐÃ GỤC NGÃ", 38, Color.white);
            Anchor(goTitle.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -70), new Vector2(900, 48));

            resultText = Txt("result", gameover.transform, "", 22, TXT);
            Anchor(resultText.gameObject, new Vector2(.5f, .5f), new Vector2(.5f, .5f), new Vector2(0, 30), new Vector2(800, 200));

            var retry = Btn("retry", gameover.transform, "CHƠI LẠI", 24, Art.Cyan, new Vector2(280, 62), () => StartRun());
            Anchor(retry.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 130), new Vector2(280, 62));

            var back = Btn("menu", gameover.transform, "Về menu", 16, DIM, new Vector2(190, 46),
                           () => { GameCtrl.I.QuitToMenu(); ShowOnly(menu); RefreshMenuTexts(); });
            Anchor(back.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 70), new Vector2(190, 46));

            gameover.SetActive(false);
        }

        GameObject MakeScreen(string name)
        {
            var go = Node(name, cv);
            Stretch(go);
            var im = go.AddComponent<Image>();
            im.color = new Color(4 / 255f, 5 / 255f, 12 / 255f, .88f);
            im.raycastTarget = true;
            return go;
        }

        // =========================================================
        //  ĐIỀU KHIỂN MÀN HÌNH
        // =========================================================
        void ShowOnly(GameObject scr)
        {
            menu.SetActive(scr == menu);
            howto.SetActive(scr == howto);
            levelup.SetActive(scr == levelup);
            pauseScr.SetActive(scr == pauseScr);
            gameover.SetActive(scr == gameover);
            bool playing = scr == null;
            hud.SetActive(playing || scr == levelup || scr == pauseScr);
            touchLayer.SetActive((playing || scr == levelup) && InputCtrl.TouchMode);
        }

        public void StartRun()
        {
            ShowOnly(null);
            GameCtrl.I.StartRun(selectedChar);
        }

        public void TogglePause()
        {
            var G = GameCtrl.I;
            if (G.State == GState.Playing)
            {
                G.State = GState.Pause;
                BuildStatText();
                ShowOnly(pauseScr);
            }
            else if (G.State == GState.Pause)
            {
                G.State = GState.Playing;
                ShowOnly(null);
            }
        }

        public void ToggleMute()
        {
            Sfx.SetMuted(!Sfx.Muted);
            RefreshMenuTexts();
        }

        void BuildStatText()
        {
            var G = GameCtrl.I;
            var s = G.Stats;
            string L(string a, string b) => $"<color=#7b86a8>{a}</color>   <color=#b6ff3a><b>{b}</b></color>";
            statText.text = string.Join("\n", new[]
            {
                L("Máu", $"{Mathf.Ceil(G.Player.hp)}/{Mathf.Round(G.Player.maxHp)}"),
                L("Hồi máu", s.regen.ToString("0.0") + "/s"),
                L("Giáp", s.armor.ToString("0")),
                L("Né tránh", Mathf.Round(s.dodge * 100f) + "%"),
                L("Sát thương", Mathf.Round(s.damage * 100f) + "%"),
                L("Tốc đánh", Mathf.Round(s.haste * 100f) + "%"),
                L("Chí mạng", Mathf.Round(s.crit * 100f) + "%"),
                L("ST chí mạng", Mathf.Round(s.critDmg * 100f) + "%"),
                L("Phạm vi", Mathf.Round(s.area * 100f) + "%"),
                L("Đạn thêm", "+" + s.proj),
                L("Tốc chạy", Mathf.Round(s.moveSpeed * 100f) + "%"),
                L("Hút máu", (s.lifesteal * 100f).ToString("0.0") + "%"),
                L("Tổng sát thương", M.FmtNum(G.DmgDealt)),
                L("Hạ gục", G.Kills.ToString()),
            });
        }

        // =========================================================
        //  LÊN CẤP — thẻ bài
        // =========================================================
        public void ShowLevelUp()
        {
            var G = GameCtrl.I;
            G.State = GState.LevelUp;
            freeRerolls = 1;
            RenderOffers();
            ShowOnly(levelup);
            Sfx.Play("levelup", .9f);
            Fx.Flash(Color.white, .4f);
            Fx.Burst(G.Player.pos, 30, Art.Cyan, 320f, .7f, 6f);
        }

        void RenderOffers()
        {
            var G = GameCtrl.I;
            offers = G.BuildOffers(Screen.width > Screen.height ? 4 : 3);

            for (int i = cardRow.childCount - 1; i >= 0; i--) Destroy(cardRow.GetChild(i).gameObject);
            foreach (var o in offers) MakeCard(o);

            rerollText.text = freeRerolls > 0 ? "🎲 Đổi bài (miễn phí)" : "🎲 Đổi bài (30 vàng)";
            rerollBtn.gameObject.SetActive(freeRerolls > 0 || G.Gold >= 30);
        }

        void MakeCard(Offer o)
        {
            string iconKey, name, desc, tag;
            Color color;
            int lv = 0, max = 0;

            switch (o.Kind)
            {
                case "evo":
                    {
                        var d = GameData.Weapons[o.Id];
                        iconKey = "w_" + o.Id; name = d.EvoName; desc = d.EvoDesc;
                        tag = "TIẾN HOÁ"; color = Art.Gold;
                        break;
                    }
                case "wup":
                    {
                        var d = GameData.Weapons[o.Id];
                        iconKey = "w_" + o.Id; name = d.Name; desc = d.Desc(o.Lv);
                        tag = "CẤP " + o.Lv; color = d.Color; lv = o.Lv; max = d.Max;
                        break;
                    }
                case "wnew":
                    {
                        var d = GameData.Weapons[o.Id];
                        iconKey = "w_" + o.Id; name = d.Name; desc = d.Tip;
                        tag = "VŨ KHÍ MỚI"; color = d.Color; lv = 1; max = d.Max;
                        break;
                    }
                case "pas":
                    {
                        var d = GameData.Passives[o.Id];
                        iconKey = "i_" + o.Id; name = d.Name; desc = d.Desc(o.Lv);
                        tag = "CẤP " + o.Lv; color = d.Color; lv = o.Lv; max = d.Max;
                        break;
                    }
                case "sig":
                    {
                        var d = Sigils.All[o.Id];
                        bool last = o.Lv == d.Max;
                        iconKey = "s_" + o.Id;
                        name = last ? d.AwName : d.Name;
                        desc = d.Desc(o.Lv);
                        tag = last ? "THỨC TỈNH" : "TẦNG " + o.Lv;
                        color = last ? Art.Gold : d.Color;
                        lv = o.Lv; max = d.Max;
                        break;
                    }
                default:
                    iconKey = "p_heart"; name = "HỒI PHỤC";
                    desc = "Hồi <color=#b6ff3a><b>40%</b></color> máu tối đa";
                    tag = "HỒI MÁU"; color = M.Hex("#ff4d6b");
                    break;
            }

            var card = Node("card", cardRow);
            Rt(card).sizeDelta = new Vector2(230, 300);
            var bg = card.AddComponent<Image>();
            bg.color = new Color(20 / 255f, 26 / 255f, 48 / 255f, .96f);
            var btn = card.AddComponent<Button>();
            btn.targetGraphic = bg;
            var captured = o;
            btn.onClick.AddListener(() => Pick(captured));

            var ol = card.AddComponent<Outline>();
            ol.effectColor = color;
            ol.effectDistance = new Vector2(1.8f, 1.8f);

            var tg = Txt("tag", card.transform, tag, 13, color);
            Anchor(tg.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -10), new Vector2(210, 20));

            var ic = Img("icon", card.transform, Color.white, Art.Get(iconKey));
            Anchor(ic.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -36), new Vector2(78, 78));

            var nm = Txt("name", card.transform, name, 17, Color.white);
            Anchor(nm.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -122), new Vector2(212, 46));

            var ds = Txt("desc", card.transform, desc, 14, DIM, TextAnchor.UpperCenter, FontStyle.Normal);
            Anchor(ds.gameObject, new Vector2(.5f, 1), new Vector2(.5f, 1), new Vector2(0, -172), new Vector2(206, 86));

            // Vũ khí: nói rõ cần gì để mở TIẾN HOÁ, kèm tiến độ hiện tại
            if ((o.Kind == "wup" || o.Kind == "wnew") && !string.IsNullOrEmpty(GameData.Weapons[o.Id].PairId))
            {
                var wd = GameData.Weapons[o.Id];
                var have = GameCtrl.I.Weapons.Find(x => x.id == o.Id);
                int curLv = have != null ? have.lv : 0;
                var pas = GameCtrl.I.Passives.Find(p => p.id == wd.PairId);
                int pasLv = pas != null ? pas.lv : 0;
                bool ok = curLv >= wd.Max && pasLv >= 3;
                string txt = (ok ? "✓ " : "⚡ ") + "Tiến hoá <b>" + wd.EvoName + "</b>: cấp tối đa <b>(" +
                             Mathf.Min(curLv, wd.Max) + "/" + wd.Max + ")</b> + " +
                             GameData.Passives[wd.PairId].Name + " cấp 3 <b>(" + Mathf.Min(pasLv, 3) + "/3)</b>";
                var rq = Txt("evoreq", card.transform, txt, 11,
                             ok ? Art.Lime : DIM, TextAnchor.UpperCenter, FontStyle.Normal);
                Anchor(rq.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0),
                       new Vector2(0, 34), new Vector2(210, 40));
            }

            // Ấn Ký chưa tới tầng cuối: nói rõ cần chỉ số gì mới mở khoá được
            if (o.Kind == "sig")
            {
                var d = Sigils.All[o.Id];
                if (o.Lv < d.Max)
                {
                    bool met = Sigils.ReqMet(GameCtrl.I, d);
                    string txt = (met ? "✓ " : "🔒 ") + "Tầng cuối: " + d.ReqLabel +
                                 "  (" + Sigils.ReqNow(GameCtrl.I, d) + ")";
                    var rq = Txt("req", card.transform, txt, 12,
                                 met ? Art.Lime : DIM, TextAnchor.UpperCenter, FontStyle.Normal);
                    Anchor(rq.gameObject, new Vector2(.5f, 0), new Vector2(.5f, 0),
                           new Vector2(0, 34), new Vector2(210, 34));
                }
            }

            if (max > 0)
            {
                var dots = Node("dots", card.transform);
                Anchor(dots, new Vector2(.5f, 0), new Vector2(.5f, 0), new Vector2(0, 16), new Vector2(200, 14));
                var lay = dots.AddComponent<HorizontalLayoutGroup>();
                lay.spacing = 5f; lay.childAlignment = TextAnchor.MiddleCenter;
                lay.childControlWidth = false; lay.childControlHeight = false;
                lay.childForceExpandWidth = false; lay.childForceExpandHeight = false;
                for (int k = 1; k <= max; k++)
                {
                    var d = Img("d", dots.transform, k <= lv ? color : new Color(1, 1, 1, .16f), Art.Get("glow"));
                    Rt(d.gameObject).sizeDelta = new Vector2(10, 10);
                }
            }
        }

        void Pick(Offer o)
        {
            Sfx.Play("select", .7f);
            GameCtrl.I.ApplyOffer(o);
            GameCtrl.I.State = GState.Playing;
            ShowOnly(null);
        }

        /// <summary>Dùng cho chế độ tự chơi kiểm thử: chọn luôn thẻ đầu tiên.</summary>
        public void SmokePickFirst()
        {
            if (offers != null && offers.Count > 0) Pick(offers[0]);
        }

        void Reroll()
        {
            var G = GameCtrl.I;
            if (freeRerolls > 0) freeRerolls--;
            else if (G.Gold >= 30) G.Gold -= 30;
            else return;
            RenderOffers();
        }

        // =========================================================
        //  THÔNG BÁO / HIỆU ỨNG HUD
        // =========================================================
        public void Announce(string text, Color c)
        {
            announceText.text = text;
            announceText.color = c;
            announceText.gameObject.SetActive(true);
            announceT = 1.9f;
        }

        public void HurtFlash() => hurtAlpha = 1f;
        float hurtAlpha;

        public void ShowBossBar(string name)
        {
            bossName.text = name;
            bossBar.SetActive(true);
        }
        public void ShowBossRule(BossRuleDef r)
        {
            if (bossRuleText == null) return;
            bossRuleText.text = r.Name + "  —  " + r.Desc;
            bossRuleText.color = r.Color;
            bossRuleGo.SetActive(true);
        }
        public void HideBossRule() { if (bossRuleGo != null) bossRuleGo.SetActive(false); }

        public void HideBossBar() { bossBar.SetActive(false); HideBossRule(); }
        public void UpdateBossBar(float f) => bossFill.fillAmount = Mathf.Clamp01(f);

        public void ShowGameOverDelayed() => Invoke(nameof(ShowGameOver), 1f);

        void ShowGameOver()
        {
            var G = GameCtrl.I;
            bool best = (G.Wave - 1) >= SaveData.Best && G.Wave > 1;
            goTitle.text = best ? "KỶ LỤC MỚI!" : "BẠN ĐÃ GỤC NGÃ";
            goTitle.color = best ? Art.Gold : Color.white;
            resultText.text =
                $"<color=#7b86a8>MÀN</color>  <color=#ffc93c><b>{G.Wave}</b></color>      " +
                $"<color=#7b86a8>HẠ GỤC</color>  <color=#ffc93c><b>{G.Kills}</b></color>\n\n" +
                $"<color=#7b86a8>THỜI GIAN</color>  <color=#ffc93c><b>{M.FmtTime(G.RunTime)}</b></color>      " +
                $"<color=#7b86a8>SÁT THƯƠNG</color>  <color=#ffc93c><b>{M.FmtNum(G.DmgDealt)}</b></color>";
            ShowOnly(gameover);
            RefreshMenuTexts();
        }

        // ---- ô vũ khí ----
        public void RefreshLoadout()
        {
            var G = GameCtrl.I;
            FillRow(weaponRow, 46, () =>
            {
                var items = new List<(string key, string lbl, Color c)>();
                foreach (var w in G.Weapons)
                {
                    var d = GameData.Weapons[w.id];
                    items.Add(("w_" + w.id, w.evolved ? "★" : (w.lv >= d.Max ? "MAX" : w.lv.ToString()),
                               w.evolved || w.lv >= d.Max ? Art.Gold : Art.Lime));
                }
                return items;
            });
            FillRow(passiveRow, 34, () =>
            {
                var items = new List<(string, string, Color)>();
                foreach (var p in G.Passives)
                {
                    var d = GameData.Passives[p.id];
                    items.Add(("i_" + p.id, p.lv.ToString(), p.lv >= d.Max ? Art.Gold : Art.Lime));
                }
                return items;
            });
            FillRow(sigilRow, 34, () =>
            {
                var items = new List<(string, string, Color)>();
                foreach (var s in G.SigilList)
                {
                    var d = Sigils.All[s.id];
                    bool maxed = s.lv >= d.Max;
                    // vàng nhấp nháy khi đã đủ chỉ số mở tầng cuối
                    Color c = maxed ? Art.Gold
                            : (Sigils.ReqMet(G, d) ? Art.Gold : M.Hex("#ff9ede"));
                    items.Add(("s_" + s.id, maxed ? "★" : s.lv.ToString(), c));
                }
                return items;
            });
        }

        void FillRow(RectTransform row, float cell, System.Func<List<(string key, string lbl, Color c)>> get)
        {
            for (int i = row.childCount - 1; i >= 0; i--) Destroy(row.GetChild(i).gameObject);
            foreach (var it in get())
            {
                var slot = Node("slot", row);
                Rt(slot).sizeDelta = new Vector2(cell, cell);
                var bgi = slot.AddComponent<Image>();
                bgi.color = new Color(6 / 255f, 9 / 255f, 20 / 255f, .75f);
                var ol = slot.AddComponent<Outline>();
                ol.effectColor = LINE; ol.effectDistance = new Vector2(1, 1);

                var ic = Img("i", slot.transform, Color.white, Art.Get(it.key));
                Stretch(ic.gameObject, 3, 3, 3, 3);

                var lv = Txt("lv", slot.transform, it.lbl, 12, it.c, TextAnchor.LowerRight);
                Stretch(lv.gameObject, 0, 2, 0, 0);
            }
        }

        // =========================================================
        //  CẬP NHẬT MỖI KHUNG HÌNH
        // =========================================================
        public void Tick(float dt)
        {
            var G = GameCtrl.I;

            // ---- lớp phủ ----
            var fc = Fx.FlashColor;
            flashImg.color = new Color(fc.r, fc.g, fc.b, Fx.FlashAmt * .5f);

            // Ấn Băng Tinh / Huyết Nguyệt: phủ màu toàn màn hình
            if (Sigils.FreezeT > 0f)
                sigilTint.color = new Color(.55f, .9f, 1f, Mathf.Min(1f, Sigils.FreezeT / 2f) * .2f);
            else if (Sigils.FlashT > 0f)
                sigilTint.color = new Color(1f, .08f, .31f, Sigils.FlashT * .55f);
            else if (sigilTint.color.a > 0f)
                sigilTint.color = new Color(0, 0, 0, 0f);

            if (hurtAlpha > 0f) hurtAlpha = Mathf.Max(0f, hurtAlpha - dt * 2.6f);
            hurtVig.color = new Color(1f, .12f, .25f, hurtAlpha * .62f);

            // ---- thông báo ----
            if (announceT > 0f)
            {
                announceT -= dt;
                float a = announceT > 1.5f ? (1.9f - announceT) / .4f : Mathf.Min(1f, announceT / .5f);
                var c = announceText.color; c.a = Mathf.Clamp01(a);
                announceText.color = c;
                float sc = announceT > 1.5f ? Mathf.Lerp(1.7f, 1f, (1.9f - announceT) / .4f) : 1f;
                announceText.transform.localScale = Vector3.one * sc;
                if (announceT <= 0f) announceText.gameObject.SetActive(false);
            }

            // ---- cần điều khiển ảo ----
            if (InputCtrl.TouchMode)
            {
                if (!touchLayer.activeSelf && (G.State == GState.Playing || G.State == GState.LevelUp))
                    touchLayer.SetActive(true);

                bool on = InputCtrl.StickActive;
                if (stickBase.gameObject.activeSelf != on)
                {
                    stickBase.gameObject.SetActive(on);
                    stickKnob.gameObject.SetActive(on);
                }
                if (on)
                {
                    stickBase.position = InputCtrl.StickCenter;
                    stickKnob.position = InputCtrl.StickKnob;
                }
                if (dashBtn != null)
                {
                    var im = dashBtn.GetComponent<Image>();
                    im.color = new Color(Art.Mag.r, Art.Mag.g, Art.Mag.b,
                        G.Player != null && G.Player.dashCd > 0f ? .07f : .2f);
                }
            }

            if (G.State != GState.Playing && G.State != GState.LevelUp && G.State != GState.Pause) return;
            if (G.Player == null) return;

            // ---- thanh & số ----
            hpFill.fillAmount = Mathf.Clamp01(G.Player.hp / G.Player.maxHp);
            hpText.text = Mathf.Ceil(G.Player.hp) + "/" + Mathf.Round(G.Player.maxHp);
            xpFill.fillAmount = Mathf.Clamp01(G.Player.xp / G.Player.xpNext);
            xpText.text = "Lv." + G.Player.level;
            waveText.text = "MÀN " + G.Wave;
            killText.text = "☠ " + G.Kills;
            goldText.text = "● " + G.Gold;

            if (G.Boss == null)
            {
                timerText.text = M.FmtTime(G.WaveTime);
                bool urgent = G.WaveTime <= 5f;
                timerText.color = urgent ? Art.Red : Color.white;
                timerText.transform.localScale = urgent
                    ? Vector3.one * (1f + Mathf.Abs(Mathf.Sin(G.Time * 8f)) * .12f)
                    : Vector3.one;
            }
            else timerText.text = "—";
        }
    }
}
