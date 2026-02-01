using UnityEngine;
using UnityEngine.UI;
using TMPro;
using BlockGlass.Core;

namespace BlockGlass.UI.Screens
{
    /// <summary>
    /// Profile screen - Guest and Logged In states
    /// Guest: Friendly avatar with soft login suggestion
    /// Logged In: Username, achievements, subscription status
    /// Login is OPTIONAL - never forced
    /// </summary>
    public class ProfileScreen : MonoBehaviour
    {
        [Header("Guest View")]
        [SerializeField] private GameObject guestView;
        [SerializeField] private Image guestAvatar;
        [SerializeField] private TextMeshProUGUI guestWelcomeText;
        [SerializeField] private TextMeshProUGUI loginBenefitText;
        [SerializeField] private GlassButton loginButton;

        [Header("Logged In View")]
        [SerializeField] private GameObject loggedInView;
        [SerializeField] private Image userAvatar;
        [SerializeField] private TextMeshProUGUI usernameText;
        [SerializeField] private TextMeshProUGUI subscriptionStatusText;

        [Header("Stats (Shared)")]
        [SerializeField] private TextMeshProUGUI gamesPlayedText;
        [SerializeField] private TextMeshProUGUI linesClearedText;
        [SerializeField] private TextMeshProUGUI highScoreClassicText;
        [SerializeField] private TextMeshProUGUI highScoreAdventureText;

        [Header("Actions")]
        [SerializeField] private GlassButton subscriptionButton;
        [SerializeField] private GlassButton logoutButton;
        [SerializeField] private Button backButton;

        [Header("Navigation")]
        [SerializeField] private Button dashboardTab;
        [SerializeField] private Button profileTab;
        [SerializeField] private Image dashboardTabIndicator;
        [SerializeField] private Image profileTabIndicator;

        private ScreenManager screenManager;

        private void Awake()
        {
            screenManager = FindObjectOfType<ScreenManager>();
            SetupButtons();
            ApplyStyle();
        }

        private void OnEnable()
        {
            UpdateView();
            SetActiveTab(1); // Profile tab is active
        }

        private void SetupButtons()
        {
            if (loginButton != null)
            {
                loginButton.onClick.AddListener(OnLoginPressed);
            }

            if (subscriptionButton != null)
            {
                subscriptionButton.onClick.AddListener(OnSubscriptionPressed);
            }

            if (logoutButton != null)
            {
                logoutButton.onClick.AddListener(OnLogoutPressed);
            }

            if (backButton != null)
            {
                backButton.onClick.AddListener(OnBackPressed);
            }

            if (dashboardTab != null)
            {
                dashboardTab.onClick.AddListener(OnDashboardPressed);
            }

            if (profileTab != null)
            {
                profileTab.onClick.AddListener(() => SetActiveTab(1));
            }
        }

        private void ApplyStyle()
        {
            if (guestWelcomeText != null)
            {
                guestWelcomeText.text = "Welcome, Player!";
                guestWelcomeText.color = ColorPalette.TextPrimary;
            }

            if (loginBenefitText != null)
            {
                loginBenefitText.text = "Sign in to sync your progress across devices and track achievements.";
                loginBenefitText.color = ColorPalette.TextSecondary;
            }
        }

        private void UpdateView()
        {
            bool isGuest = SaveSystem.IsGuest();

            if (guestView != null) guestView.SetActive(isGuest);
            if (loggedInView != null) loggedInView.SetActive(!isGuest);

            if (!isGuest)
            {
                if (usernameText != null)
                {
                    usernameText.text = SaveSystem.GetUsername();
                    usernameText.color = ColorPalette.TextPrimary;
                }

                UpdateSubscriptionStatus();
            }

            UpdateStats();
        }

        private void UpdateStats()
        {
            if (gamesPlayedText != null)
            {
                int games = SaveSystem.GetTotalGamesPlayed();
                gamesPlayedText.text = $"Games Played: {games:N0}";
                gamesPlayedText.color = ColorPalette.TextSecondary;
            }

            if (linesClearedText != null)
            {
                int lines = SaveSystem.GetTotalLinesCleared();
                linesClearedText.text = $"Lines Cleared: {lines:N0}";
                linesClearedText.color = ColorPalette.TextSecondary;
            }

            if (highScoreClassicText != null)
            {
                int score = SaveSystem.GetHighScore(GameMode.Classic);
                highScoreClassicText.text = $"Classic Best: {score:N0}";
                highScoreClassicText.color = ColorPalette.TextSecondary;
            }

            if (highScoreAdventureText != null)
            {
                int level = SaveSystem.GetAdventureLevel();
                highScoreAdventureText.text = $"Adventure Level: {level}";
                highScoreAdventureText.color = ColorPalette.TextSecondary;
            }
        }

        private void UpdateSubscriptionStatus()
        {
            if (subscriptionStatusText == null) return;

            SubscriptionTier tier = SaveSystem.GetSubscriptionTier();

            string statusText = tier switch
            {
                SubscriptionTier.Free => "Free",
                SubscriptionTier.Lite => "Lite Subscriber",
                SubscriptionTier.Pro => "Pro Subscriber",
                SubscriptionTier.Premium => "Premium Member",
                _ => "Free"
            };

            subscriptionStatusText.text = statusText;
            subscriptionStatusText.color = tier == SubscriptionTier.Free
                ? ColorPalette.TextSecondary
                : ColorPalette.Accent;
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

        private void OnLoginPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            // In a real app, this would open authentication flow
            // For now, simulate login
            SaveSystem.SetGuest(false);
            SaveSystem.SetUsername("Player123");
            UpdateView();
        }

        private void OnLogoutPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            SaveSystem.SetGuest(true);
            UpdateView();
        }

        private void OnSubscriptionPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            screenManager?.ShowScreen(ScreenType.Subscription);
        }

        private void OnBackPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            screenManager?.ShowScreen(ScreenType.Dashboard);
        }

        private void OnDashboardPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            SetActiveTab(0);
            screenManager?.ShowScreen(ScreenType.Dashboard);
        }
    }
}
