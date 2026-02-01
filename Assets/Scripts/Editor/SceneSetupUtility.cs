using UnityEngine;
using UnityEngine.UI;
using TMPro;
#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
#endif

namespace BlockGlass.Editor
{
    /// <summary>
    /// Editor utility to set up the complete Main scene with all UI elements
    /// Run from menu: BlockGlass → Setup Main Scene
    /// </summary>
    public class SceneSetupUtility
    {
#if UNITY_EDITOR
        [MenuItem("BlockGlass/Setup Main Scene")]
        public static void SetupMainScene()
        {
            // Create new scene or use current
            var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);

            // Set camera background
            Camera.main.backgroundColor = new Color(0.05f, 0.07f, 0.12f, 1f);
            Camera.main.orthographic = true;
            Camera.main.orthographicSize = 5f;

            // Create Managers parent
            GameObject managers = new GameObject("--- MANAGERS ---");
            
            // GameManager
            GameObject gameManager = new GameObject("GameManager");
            gameManager.transform.SetParent(managers.transform);
            gameManager.AddComponent<Core.GameManager>();

            // AudioManager
            GameObject audioManager = new GameObject("AudioManager");
            audioManager.transform.SetParent(managers.transform);
            audioManager.AddComponent<Core.AudioManager>();
            audioManager.AddComponent<AudioSource>(); // Music source
            audioManager.AddComponent<AudioSource>(); // SFX source

            // Create UI Canvas
            GameObject canvas = CreateCanvas("UI Canvas");

            // Create Screen Manager
            GameObject screenManager = new GameObject("ScreenManager");
            screenManager.transform.SetParent(managers.transform);
            var sm = screenManager.AddComponent<Core.ScreenManager>();

            // Create all screens as children of canvas
            CreateSplashScreen(canvas.transform);
            CreateDashboardScreen(canvas.transform);
            CreateGameplayScreen(canvas.transform);
            CreateProfileScreen(canvas.transform);
            CreateSettingsScreen(canvas.transform);
            CreateSubscriptionScreen(canvas.transform);

            // Create Modals
            CreateGameOverModal(canvas.transform);

            // Create Gameplay parent
            GameObject gameplay = new GameObject("--- GAMEPLAY ---");
            
            GameObject gridManager = new GameObject("GridManager");
            gridManager.transform.SetParent(gameplay.transform);
            gridManager.AddComponent<Gameplay.GridManager>();

            GameObject blockSpawner = new GameObject("BlockSpawner");
            blockSpawner.transform.SetParent(gameplay.transform);
            blockSpawner.AddComponent<Gameplay.BlockSpawner>();

            GameObject scoreManager = new GameObject("ScoreManager");
            scoreManager.transform.SetParent(gameplay.transform);
            scoreManager.AddComponent<Gameplay.ScoreManager>();

            GameObject helperSystem = new GameObject("HelperSystem");
            helperSystem.transform.SetParent(gameplay.transform);
            helperSystem.AddComponent<Gameplay.HelperSystem>();

            GameObject dragDrop = new GameObject("DragDropController");
            dragDrop.transform.SetParent(gameplay.transform);
            dragDrop.AddComponent<Gameplay.DragDropController>();

            // Main Scene Controller
            GameObject mainController = new GameObject("MainSceneController");
            mainController.transform.SetParent(managers.transform);
            mainController.AddComponent<MainSceneController>();

            // Save scene
            EditorSceneManager.SaveScene(scene, "Assets/Scenes/Main.unity");
            Debug.Log("[SceneSetup] Main scene created at Assets/Scenes/Main.unity");
        }

        private static GameObject CreateCanvas(string name)
        {
            GameObject canvasObj = new GameObject(name);
            Canvas canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 0;

            CanvasScaler scaler = canvasObj.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;

            canvasObj.AddComponent<GraphicRaycaster>();

            // EventSystem
            if (UnityEngine.EventSystems.EventSystem.current == null)
            {
                GameObject eventSystem = new GameObject("EventSystem");
                eventSystem.AddComponent<UnityEngine.EventSystems.EventSystem>();
                eventSystem.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
            }

            return canvasObj;
        }

        private static void CreateSplashScreen(Transform parent)
        {
            GameObject screen = CreateScreen("SplashScreen", parent);
            screen.AddComponent<UI.Screens.SplashScreen>();

            // Logo
            GameObject logo = CreateImage("Logo", screen.transform);
            RectTransform logoRect = logo.GetComponent<RectTransform>();
            logoRect.anchoredPosition = Vector2.zero;
            logoRect.sizeDelta = new Vector2(400, 200);

            // Glass overlay
            GameObject overlay = CreateImage("GlassOverlay", screen.transform);
            overlay.GetComponent<Image>().color = new Color(0.1f, 0.12f, 0.18f, 0f);
            StretchToParent(overlay.GetComponent<RectTransform>());
        }

        private static void CreateDashboardScreen(Transform parent)
        {
            GameObject screen = CreateScreen("DashboardScreen", parent);
            screen.AddComponent<UI.Screens.DashboardScreen>();
            screen.SetActive(false);

            // Top Bar
            GameObject topBar = CreatePanel("TopBar", screen.transform);
            RectTransform topRect = topBar.GetComponent<RectTransform>();
            topRect.anchorMin = new Vector2(0, 1);
            topRect.anchorMax = new Vector2(1, 1);
            topRect.pivot = new Vector2(0.5f, 1);
            topRect.sizeDelta = new Vector2(0, 120);
            topRect.anchoredPosition = Vector2.zero;
            topBar.AddComponent<UI.GlassPanel>();

            // Title
            GameObject title = CreateText("Title", topBar.transform, "BlockGlass!");

            // Mode Buttons Container
            GameObject buttonContainer = CreatePanel("ModeButtons", screen.transform);
            buttonContainer.GetComponent<Image>().color = Color.clear;
            RectTransform btnRect = buttonContainer.GetComponent<RectTransform>();
            btnRect.anchoredPosition = Vector2.zero;
            btnRect.sizeDelta = new Vector2(800, 400);

            // Classic Button
            GameObject classicBtn = CreateButton("ClassicButton", buttonContainer.transform, "Classic");
            classicBtn.AddComponent<UI.GlassButton>();

            // Adventure Button
            GameObject adventureBtn = CreateButton("AdventureButton", buttonContainer.transform, "Adventure");
            adventureBtn.AddComponent<UI.GlassButton>();

            // Bottom Nav
            GameObject bottomNav = CreatePanel("BottomNav", screen.transform);
            RectTransform bottomRect = bottomNav.GetComponent<RectTransform>();
            bottomRect.anchorMin = new Vector2(0, 0);
            bottomRect.anchorMax = new Vector2(1, 0);
            bottomRect.pivot = new Vector2(0.5f, 0);
            bottomRect.sizeDelta = new Vector2(0, 100);
            bottomRect.anchoredPosition = Vector2.zero;
            bottomNav.AddComponent<UI.GlassPanel>();
        }

        private static void CreateGameplayScreen(Transform parent)
        {
            GameObject screen = CreateScreen("GameplayScreen", parent);
            screen.AddComponent<UI.Screens.GameplayScreen>();
            screen.SetActive(false);

            // Score Display
            GameObject scorePanel = CreatePanel("ScorePanel", screen.transform);
            RectTransform scoreRect = scorePanel.GetComponent<RectTransform>();
            scoreRect.anchorMin = new Vector2(0, 1);
            scoreRect.anchorMax = new Vector2(1, 1);
            scoreRect.pivot = new Vector2(0.5f, 1);
            scoreRect.sizeDelta = new Vector2(0, 150);
            scorePanel.AddComponent<UI.GlassPanel>();

            GameObject scoreText = CreateText("ScoreText", scorePanel.transform, "0");
            scoreText.GetComponent<TextMeshProUGUI>().fontSize = 72;

            // Grid Area (placeholder - actual grid created at runtime)
            GameObject gridArea = CreatePanel("GridArea", screen.transform);
            gridArea.GetComponent<Image>().color = new Color(0.1f, 0.12f, 0.16f, 1f);
            RectTransform gridRect = gridArea.GetComponent<RectTransform>();
            gridRect.anchoredPosition = new Vector2(0, 50);
            gridRect.sizeDelta = new Vector2(800, 800);

            // Spawn Area
            GameObject spawnArea = CreatePanel("SpawnArea", screen.transform);
            spawnArea.GetComponent<Image>().color = Color.clear;
            RectTransform spawnRect = spawnArea.GetComponent<RectTransform>();
            spawnRect.anchorMin = new Vector2(0, 0);
            spawnRect.anchorMax = new Vector2(1, 0);
            spawnRect.pivot = new Vector2(0.5f, 0);
            spawnRect.sizeDelta = new Vector2(0, 200);
            spawnRect.anchoredPosition = new Vector2(0, 120);

            // Helper Tray
            GameObject helperTray = CreatePanel("HelperTray", screen.transform);
            helperTray.AddComponent<UI.GlassPanel>();
            RectTransform helperRect = helperTray.GetComponent<RectTransform>();
            helperRect.anchorMin = new Vector2(0, 0);
            helperRect.anchorMax = new Vector2(1, 0);
            helperRect.pivot = new Vector2(0.5f, 0);
            helperRect.sizeDelta = new Vector2(0, 100);
            helperRect.anchoredPosition = Vector2.zero;
        }

        private static void CreateProfileScreen(Transform parent)
        {
            GameObject screen = CreateScreen("ProfileScreen", parent);
            screen.AddComponent<UI.Screens.ProfileScreen>();
            screen.SetActive(false);

            // Guest View
            GameObject guestView = CreatePanel("GuestView", screen.transform);
            guestView.GetComponent<Image>().color = Color.clear;
            StretchToParent(guestView.GetComponent<RectTransform>());

            // Logged In View
            GameObject loggedInView = CreatePanel("LoggedInView", screen.transform);
            loggedInView.GetComponent<Image>().color = Color.clear;
            StretchToParent(loggedInView.GetComponent<RectTransform>());
            loggedInView.SetActive(false);
        }

        private static void CreateSettingsScreen(Transform parent)
        {
            GameObject screen = CreateScreen("SettingsScreen", parent);
            screen.AddComponent<UI.Screens.SettingsScreen>();
            screen.SetActive(false);

            // Settings Panel
            GameObject panel = CreatePanel("SettingsPanel", screen.transform);
            panel.AddComponent<UI.GlassPanel>();
            RectTransform panelRect = panel.GetComponent<RectTransform>();
            panelRect.anchoredPosition = Vector2.zero;
            panelRect.sizeDelta = new Vector2(900, 800);
        }

        private static void CreateSubscriptionScreen(Transform parent)
        {
            GameObject screen = CreateScreen("SubscriptionScreen", parent);
            screen.AddComponent<UI.Screens.SubscriptionScreen>();
            screen.SetActive(false);

            // Tier Cards Container
            GameObject cards = CreatePanel("TierCards", screen.transform);
            cards.GetComponent<Image>().color = Color.clear;
            StretchToParent(cards.GetComponent<RectTransform>());
        }

        private static void CreateGameOverModal(Transform parent)
        {
            GameObject modal = CreateScreen("GameOverModal", parent);
            modal.AddComponent<UI.Screens.GameOverModal>();
            modal.SetActive(false);

            // Dim background
            GameObject dim = CreateImage("DimBackground", modal.transform);
            dim.GetComponent<Image>().color = new Color(0, 0, 0, 0.6f);
            StretchToParent(dim.GetComponent<RectTransform>());

            // Modal Panel
            GameObject panel = CreatePanel("ModalPanel", modal.transform);
            panel.AddComponent<UI.GlassPanel>();
            RectTransform panelRect = panel.GetComponent<RectTransform>();
            panelRect.anchoredPosition = Vector2.zero;
            panelRect.sizeDelta = new Vector2(800, 600);

            // Score texts
            CreateText("FinalScoreLabel", panel.transform, "Score");
            CreateText("FinalScoreText", panel.transform, "0");
            CreateText("BestScoreLabel", panel.transform, "Best");
            CreateText("BestScoreText", panel.transform, "0");

            // Buttons
            CreateButton("ContinueButton", panel.transform, "Continue");
            CreateButton("RestartButton", panel.transform, "Restart");
        }

        #region Helper Methods

        private static GameObject CreateScreen(string name, Transform parent)
        {
            GameObject screen = new GameObject(name);
            screen.transform.SetParent(parent);
            
            RectTransform rect = screen.AddComponent<RectTransform>();
            StretchToParent(rect);
            
            CanvasGroup cg = screen.AddComponent<CanvasGroup>();
            
            return screen;
        }

        private static GameObject CreatePanel(string name, Transform parent)
        {
            GameObject panel = new GameObject(name);
            panel.transform.SetParent(parent);
            
            RectTransform rect = panel.AddComponent<RectTransform>();
            Image img = panel.AddComponent<Image>();
            img.color = new Color(0.1f, 0.12f, 0.18f, 0.85f);
            
            return panel;
        }

        private static GameObject CreateImage(string name, Transform parent)
        {
            GameObject img = new GameObject(name);
            img.transform.SetParent(parent);
            
            img.AddComponent<RectTransform>();
            img.AddComponent<Image>();
            
            return img;
        }

        private static GameObject CreateText(string name, Transform parent, string text)
        {
            GameObject textObj = new GameObject(name);
            textObj.transform.SetParent(parent);
            
            RectTransform rect = textObj.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(400, 60);
            
            TextMeshProUGUI tmp = textObj.AddComponent<TextMeshProUGUI>();
            tmp.text = text;
            tmp.fontSize = 36;
            tmp.color = new Color(0.95f, 0.96f, 0.98f, 1f);
            tmp.alignment = TextAlignmentOptions.Center;
            
            return textObj;
        }

        private static GameObject CreateButton(string name, Transform parent, string text)
        {
            GameObject btnObj = new GameObject(name);
            btnObj.transform.SetParent(parent);
            
            RectTransform rect = btnObj.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(300, 80);
            
            Image img = btnObj.AddComponent<Image>();
            img.color = new Color(0.2f, 0.85f, 0.9f, 0.9f);
            
            Button btn = btnObj.AddComponent<Button>();
            
            // Button text
            GameObject textObj = CreateText("Text", btnObj.transform, text);
            StretchToParent(textObj.GetComponent<RectTransform>());
            
            return btnObj;
        }

        private static void StretchToParent(RectTransform rect)
        {
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.sizeDelta = Vector2.zero;
            rect.anchoredPosition = Vector2.zero;
        }

        #endregion

        [MenuItem("BlockGlass/Create Default Shapes")]
        public static void CreateDefaultShapes()
        {
            Gameplay.ShapeLibrary.CreateDefaultShapes();
        }

        [MenuItem("BlockGlass/Create Prefabs")]
        public static void CreatePrefabs()
        {
            // Ensure directories exist
            if (!AssetDatabase.IsValidFolder("Assets/Prefabs"))
            {
                AssetDatabase.CreateFolder("Assets", "Prefabs");
            }
            if (!AssetDatabase.IsValidFolder("Assets/Prefabs/UI"))
            {
                AssetDatabase.CreateFolder("Assets/Prefabs", "UI");
            }
            if (!AssetDatabase.IsValidFolder("Assets/Prefabs/Gameplay"))
            {
                AssetDatabase.CreateFolder("Assets/Prefabs", "Gameplay");
            }

            // Create Cell prefab
            GameObject cell = new GameObject("Cell");
            SpriteRenderer cellSR = cell.AddComponent<SpriteRenderer>();
            cellSR.color = new Color(0.15f, 0.18f, 0.24f, 1f);
            PrefabUtility.SaveAsPrefabAsset(cell, "Assets/Prefabs/Gameplay/Cell.prefab");
            Object.DestroyImmediate(cell);

            // Create Block prefab
            GameObject block = new GameObject("Block");
            SpriteRenderer blockSR = block.AddComponent<SpriteRenderer>();
            blockSR.color = new Color(0.2f, 0.85f, 0.9f, 1f);
            blockSR.sortingOrder = 1;
            PrefabUtility.SaveAsPrefabAsset(block, "Assets/Prefabs/Gameplay/Block.prefab");
            Object.DestroyImmediate(block);

            // Create BlockPreview prefab
            GameObject preview = new GameObject("BlockPreview");
            SpriteRenderer previewSR = preview.AddComponent<SpriteRenderer>();
            previewSR.color = new Color(0.2f, 0.85f, 0.9f, 0.8f);
            PrefabUtility.SaveAsPrefabAsset(preview, "Assets/Prefabs/Gameplay/BlockPreview.prefab");
            Object.DestroyImmediate(preview);

            AssetDatabase.SaveAssets();
            Debug.Log("[SceneSetup] Prefabs created in Assets/Prefabs/");
        }
#endif
    }
}
