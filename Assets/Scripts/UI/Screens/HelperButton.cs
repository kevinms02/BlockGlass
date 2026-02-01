using UnityEngine;
using UnityEngine.UI;
using TMPro;
using BlockGlass.Gameplay;

namespace BlockGlass.UI.Screens
{
    /// <summary>
    /// Helper button UI component for the helper tray
    /// Shows usage count and ad indicator
    /// </summary>
    public class HelperButton : MonoBehaviour
    {
        [Header("Visual References")]
        [SerializeField] private Image backgroundImage;
        [SerializeField] private Image iconImage;
        [SerializeField] private TextMeshProUGUI usageText; // Shows "1/3"
        [SerializeField] private GameObject adIndicator; // Small video icon

        [Header("Icons")]
        [SerializeField] private Sprite normalIcon;
        [SerializeField] private Sprite disabledIcon;

        [Header("Settings")]
        [SerializeField] private HelperType helperType;

        public event System.Action OnClick;

        private Button button;
        private bool isAvailable = true;

        private void Awake()
        {
            button = GetComponent<Button>();
            if (button != null)
            {
                button.onClick.AddListener(HandleClick);
            }

            ApplyStyle();
        }

        private void ApplyStyle()
        {
            if (backgroundImage != null)
            {
                backgroundImage.color = ColorPalette.GetGlassColor(0.85f);
            }
        }

        public void UpdateDisplay(HelperDisplayInfo info)
        {
            isAvailable = info.IsAvailable;

            // Update usage text
            if (usageText != null)
            {
                int used = 3 - info.UsesRemaining;
                usageText.text = $"{used}/3";
                usageText.color = info.IsAvailable ? ColorPalette.TextPrimary : ColorPalette.TextDisabled;
            }

            // Show/hide ad indicator
            if (adIndicator != null)
            {
                adIndicator.SetActive(info.NeedsAd && info.IsAvailable);
            }

            // Update visual state
            UpdateVisualState(info.IsAvailable);
        }

        private void UpdateVisualState(bool available)
        {
            if (backgroundImage != null)
            {
                backgroundImage.color = available
                    ? ColorPalette.GetGlassColor(0.85f)
                    : ColorPalette.WithAlpha(ColorPalette.TextDisabled, 0.3f);
            }

            if (iconImage != null)
            {
                iconImage.sprite = available ? normalIcon : disabledIcon;
                iconImage.color = available ? ColorPalette.TextPrimary : ColorPalette.TextDisabled;
            }

            if (button != null)
            {
                button.interactable = available;
            }
        }

        private void HandleClick()
        {
            if (!isAvailable) return;

            Core.AudioManager.Instance?.PlaySfx(Core.SoundType.ButtonClick);
            OnClick?.Invoke();
        }
    }
}
