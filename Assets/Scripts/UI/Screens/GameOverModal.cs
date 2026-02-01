using UnityEngine;
using UnityEngine.UI;
using TMPro;
using BlockGlass.Core;
using BlockGlass.Ads;

namespace BlockGlass.UI.Screens
{
    /// <summary>
    /// Game Over modal with calm, respectful tone
    /// Shows final score, best score, continue (ad) and restart options
    /// NO guilt language, NO pressure language
    /// </summary>
    public class GameOverModal : MonoBehaviour
    {
        [Header("Glass Panel")]
        [SerializeField] private GlassPanel glassPanel;
        [SerializeField] private Image dimBackground;

        [Header("Score Display")]
        [SerializeField] private TextMeshProUGUI finalScoreLabel;
        [SerializeField] private TextMeshProUGUI finalScoreText;
        [SerializeField] private TextMeshProUGUI bestScoreLabel;
        [SerializeField] private TextMeshProUGUI bestScoreText;
        [SerializeField] private GameObject newHighScoreIndicator;

        [Header("Buttons")]
        [SerializeField] private GlassButton continueButton; // Rewarded ad
        [SerializeField] private GlassButton restartButton;
        [SerializeField] private Button closeButton;

        [Header("Continue Button")]
        [SerializeField] private Image adIconOnContinue;
        [SerializeField] private TextMeshProUGUI continueButtonText;

        private ScreenManager screenManager;
        private bool isNewHighScore = false;

        private void Awake()
        {
            screenManager = FindObjectOfType<ScreenManager>();
            SetupButtons();
            ApplyStyle();
        }

        private void OnEnable()
        {
            UpdateDisplay();
            CheckContinueAvailability();
        }

        private void SetupButtons()
        {
            if (continueButton != null)
            {
                continueButton.onClick.AddListener(OnContinuePressed);
            }

            if (restartButton != null)
            {
                restartButton.onClick.AddListener(OnRestartPressed);
            }

            if (closeButton != null)
            {
                closeButton.onClick.AddListener(OnClosePressed);
            }
        }

        private void ApplyStyle()
        {
            if (dimBackground != null)
            {
                dimBackground.color = ColorPalette.WithAlpha(Color.black, 0.6f);
            }

            if (finalScoreLabel != null)
            {
                finalScoreLabel.text = "Score";
                finalScoreLabel.color = ColorPalette.TextSecondary;
            }

            if (bestScoreLabel != null)
            {
                bestScoreLabel.text = "Best";
                bestScoreLabel.color = ColorPalette.TextSecondary;
            }

            if (continueButtonText != null)
            {
                continueButtonText.text = "Continue";
            }
        }

        private void UpdateDisplay()
        {
            Gameplay.ScoreManager scoreManager = Gameplay.ScoreManager.Instance;

            if (scoreManager != null)
            {
                int finalScore = scoreManager.CurrentScore;
                int bestScore = scoreManager.BestScore;

                if (finalScoreText != null)
                {
                    finalScoreText.text = finalScore.ToString("N0");
                    finalScoreText.color = ColorPalette.Accent;
                }

                if (bestScoreText != null)
                {
                    bestScoreText.text = bestScore.ToString("N0");
                    bestScoreText.color = ColorPalette.TextPrimary;
                }

                isNewHighScore = finalScore >= bestScore && finalScore > 0;

                if (newHighScoreIndicator != null)
                {
                    newHighScoreIndicator.SetActive(isNewHighScore);
                }
            }
        }

        private void CheckContinueAvailability()
        {
            // Continue is available if:
            // 1. Ads are available OR
            // 2. User has Pro subscription

            bool hasSubscription = SaveSystem.GetSubscriptionTier() >= SubscriptionTier.Pro;
            bool adsAvailable = AdManager.Instance?.IsRewardedAdReady() ?? false;

            bool canContinue = hasSubscription || adsAvailable;

            if (continueButton != null)
            {
                continueButton.Interactable = canContinue;
            }

            if (adIconOnContinue != null)
            {
                // Hide ad icon if user has subscription
                adIconOnContinue.gameObject.SetActive(!hasSubscription && canContinue);
            }
        }

        private void OnContinuePressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);

            bool hasSubscription = SaveSystem.GetSubscriptionTier() >= SubscriptionTier.Pro;

            if (hasSubscription)
            {
                // Continue directly for subscribers
                ContinueGame();
            }
            else
            {
                // Show rewarded ad
                AdManager.Instance?.ShowRewardedAd(
                    onSuccess: ContinueGame,
                    onFailed: () => Debug.Log("[GameOver] Ad failed, cannot continue")
                );
            }
        }

        private void ContinueGame()
        {
            // Hide modal
            screenManager?.HideCurrentModal();

            // Resume game (clear some blocks to give player another chance)
            Gameplay.GridManager gridManager = Gameplay.GridManager.Instance;
            if (gridManager != null)
            {
                // Use a bomb on the center to clear some space
                int centerX = gridManager.GridWidth / 2;
                int centerY = gridManager.GridHeight / 2;
                gridManager.UseBomb(centerX, centerY);
            }

            // Resume
            GameManager.Instance?.SetState(GameState.Playing);
        }

        private void OnRestartPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);

            // Hide modal
            screenManager?.HideCurrentModal();

            // Check if we should show interstitial ad
            bool hasSubscription = SaveSystem.GetSubscriptionTier() >= SubscriptionTier.Lite;

            if (!hasSubscription)
            {
                AdManager.Instance?.ShowInterstitial(() =>
                {
                    GameManager.Instance?.RestartGame();
                });
            }
            else
            {
                GameManager.Instance?.RestartGame();
            }
        }

        private void OnClosePressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);

            // Hide modal
            screenManager?.HideCurrentModal();

            // Return to menu
            bool hasSubscription = SaveSystem.GetSubscriptionTier() >= SubscriptionTier.Lite;

            if (!hasSubscription)
            {
                AdManager.Instance?.ShowInterstitial(() =>
                {
                    GameManager.Instance?.ReturnToMenu();
                });
            }
            else
            {
                GameManager.Instance?.ReturnToMenu();
            }
        }
    }
}
