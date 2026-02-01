using UnityEngine;
using UnityEngine.UI;
using TMPro;
using BlockGlass.Core;

namespace BlockGlass.UI.Screens
{
    /// <summary>
    /// Dashboard/Home screen with mode selection
    /// Two primary buttons: Classic and Adventure
    /// Top bar with title, achievements, settings
    /// Bottom navigation with Dashboard and Profile tabs
    /// </summary>
    public class DashboardScreen : MonoBehaviour
    {
        [Header("Top Bar")]
        [SerializeField] private TextMeshProUGUI titleText;
        [SerializeField] private Button achievementsButton;
        [SerializeField] private Button settingsButton;

        [Header("Mode Buttons")]
        [SerializeField] private GlassButton classicButton;
        [SerializeField] private GlassButton adventureButton;
        [SerializeField] private TextMeshProUGUI classicHighScoreText;
        [SerializeField] private TextMeshProUGUI adventureProgressText;

        [Header("Bottom Navigation")]
        [SerializeField] private Button dashboardTab;
        [SerializeField] private Button profileTab;
        [SerializeField] private Image dashboardTabIndicator;
        [SerializeField] private Image profileTabIndicator;

        [Header("Visual")]
        [SerializeField] private Image backgroundGradient;

        private ScreenManager screenManager;

        private void Awake()
        {
            screenManager = FindObjectOfType<ScreenManager>();
            SetupButtons();
            ApplyVisualStyle();
        }

        private void OnEnable()
        {
            UpdateScoreDisplays();
            SetActiveTab(0);
        }

        private void SetupButtons()
        {
            if (classicButton != null)
            {
                classicButton.onClick.AddListener(OnClassicPressed);
            }

            if (adventureButton != null)
            {
                adventureButton.onClick.AddListener(OnAdventurePressed);
            }

            if (achievementsButton != null)
            {
                achievementsButton.onClick.AddListener(OnAchievementsPressed);
            }

            if (settingsButton != null)
            {
                settingsButton.onClick.AddListener(OnSettingsPressed);
            }

            if (dashboardTab != null)
            {
                dashboardTab.onClick.AddListener(() => SetActiveTab(0));
            }

            if (profileTab != null)
            {
                profileTab.onClick.AddListener(OnProfilePressed);
            }
        }

        private void ApplyVisualStyle()
        {
            if (titleText != null)
            {
                titleText.text = "BlockGlass!";
                titleText.color = ColorPalette.TextPrimary;
            }

            // Apply background gradient
            if (backgroundGradient != null)
            {
                // Note: For a true gradient, use a gradient texture or custom shader
                backgroundGradient.color = ColorPalette.BackgroundDark;
            }
        }

        private void UpdateScoreDisplays()
        {
            if (classicHighScoreText != null)
            {
                int highScore = SaveSystem.GetHighScore(GameMode.Classic);
                classicHighScoreText.text = highScore > 0 ? $"Best: {highScore:N0}" : "New Game";
                classicHighScoreText.color = ColorPalette.TextSecondary;
            }

            if (adventureProgressText != null)
            {
                int level = SaveSystem.GetAdventureLevel();
                adventureProgressText.text = $"Level {level}";
                adventureProgressText.color = ColorPalette.TextSecondary;
            }
        }

        private void SetActiveTab(int tabIndex)
        {
            if (dashboardTabIndicator != null)
            {
                dashboardTabIndicator.color = tabIndex == 0
                    ? ColorPalette.Accent
                    : ColorPalette.TextDisabled;
            }

            if (profileTabIndicator != null)
            {
                profileTabIndicator.color = tabIndex == 1
                    ? ColorPalette.Accent
                    : ColorPalette.TextDisabled;
            }
        }

        private void OnClassicPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            GameManager.Instance?.StartGame(GameMode.Classic);
        }

        private void OnAdventurePressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            GameManager.Instance?.StartGame(GameMode.Adventure);
        }

        private void OnAchievementsPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            // TODO: Show achievements modal
            Debug.Log("[Dashboard] Achievements pressed");
        }

        private void OnSettingsPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            screenManager?.ShowScreen(ScreenType.Settings);
        }

        private void OnProfilePressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            SetActiveTab(1);
            screenManager?.ShowScreen(ScreenType.Profile);
        }
    }
}
