using UnityEngine;
using UnityEngine.UI;
using TMPro;
using BlockGlass.Core;

namespace BlockGlass.UI.Screens
{
    /// <summary>
    /// Settings screen with toggles and links
    /// Music, Sound, Vibration toggles
    /// Privacy Policy and Terms links
    /// </summary>
    public class SettingsScreen : MonoBehaviour
    {
        [Header("Glass Panel")]
        [SerializeField] private GlassPanel glassPanel;

        [Header("Audio Toggles")]
        [SerializeField] private Toggle musicToggle;
        [SerializeField] private TextMeshProUGUI musicLabel;
        [SerializeField] private Toggle soundToggle;
        [SerializeField] private TextMeshProUGUI soundLabel;

        [Header("Haptics")]
        [SerializeField] private Toggle vibrationToggle;
        [SerializeField] private TextMeshProUGUI vibrationLabel;

        [Header("Links")]
        [SerializeField] private Button privacyPolicyButton;
        [SerializeField] private Button termsButton;

        [Header("Actions")]
        [SerializeField] private Button backButton;
        [SerializeField] private Button resetProgressButton;

        [Header("URLs")]
        [SerializeField] private string privacyPolicyUrl = "https://example.com/privacy";
        [SerializeField] private string termsUrl = "https://example.com/terms";

        private ScreenManager screenManager;

        private void Awake()
        {
            screenManager = FindObjectOfType<ScreenManager>();
            SetupListeners();
            ApplyStyle();
        }

        private void OnEnable()
        {
            LoadSettings();
        }

        private void SetupListeners()
        {
            if (musicToggle != null)
            {
                musicToggle.onValueChanged.AddListener(OnMusicToggled);
            }

            if (soundToggle != null)
            {
                soundToggle.onValueChanged.AddListener(OnSoundToggled);
            }

            if (vibrationToggle != null)
            {
                vibrationToggle.onValueChanged.AddListener(OnVibrationToggled);
            }

            if (privacyPolicyButton != null)
            {
                privacyPolicyButton.onClick.AddListener(OnPrivacyPolicyPressed);
            }

            if (termsButton != null)
            {
                termsButton.onClick.AddListener(OnTermsPressed);
            }

            if (backButton != null)
            {
                backButton.onClick.AddListener(OnBackPressed);
            }

            if (resetProgressButton != null)
            {
                resetProgressButton.onClick.AddListener(OnResetProgressPressed);
            }
        }

        private void ApplyStyle()
        {
            if (musicLabel != null)
            {
                musicLabel.text = "Music";
                musicLabel.color = ColorPalette.TextPrimary;
            }

            if (soundLabel != null)
            {
                soundLabel.text = "Sound Effects";
                soundLabel.color = ColorPalette.TextPrimary;
            }

            if (vibrationLabel != null)
            {
                vibrationLabel.text = "Vibration";
                vibrationLabel.color = ColorPalette.TextPrimary;
            }
        }

        private void LoadSettings()
        {
            AudioManager audio = AudioManager.Instance;

            if (musicToggle != null && audio != null)
            {
                musicToggle.SetIsOnWithoutNotify(audio.MusicEnabled);
            }

            if (soundToggle != null && audio != null)
            {
                soundToggle.SetIsOnWithoutNotify(audio.SfxEnabled);
            }

            if (vibrationToggle != null && audio != null)
            {
                vibrationToggle.SetIsOnWithoutNotify(audio.VibrationEnabled);
            }
        }

        private void OnMusicToggled(bool enabled)
        {
            AudioManager.Instance?.ToggleMusic(enabled);
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
        }

        private void OnSoundToggled(bool enabled)
        {
            AudioManager.Instance?.ToggleSfx(enabled);
            if (enabled)
            {
                AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            }
        }

        private void OnVibrationToggled(bool enabled)
        {
            AudioManager.Instance?.ToggleVibration(enabled);
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            if (enabled)
            {
                AudioManager.Instance?.Vibrate(VibrationType.Light);
            }
        }

        private void OnPrivacyPolicyPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            Application.OpenURL(privacyPolicyUrl);
        }

        private void OnTermsPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            Application.OpenURL(termsUrl);
        }

        private void OnBackPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);

            // Return to previous screen based on game state
            GameState state = GameManager.Instance?.CurrentState ?? GameState.Menu;

            if (state == GameState.Playing || state == GameState.Paused)
            {
                screenManager?.ShowScreen(ScreenType.Gameplay);
                GameManager.Instance?.ResumeGame();
            }
            else
            {
                screenManager?.ShowScreen(ScreenType.Dashboard);
            }
        }

        private void OnResetProgressPressed()
        {
            AudioManager.Instance?.PlaySfx(SoundType.ButtonClick);
            // In a real app, show confirmation dialog first
            // SaveSystem.ClearAll();
            Debug.Log("[Settings] Reset progress requested - confirmation required");
        }
    }
}
