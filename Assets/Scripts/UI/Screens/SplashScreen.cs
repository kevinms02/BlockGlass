using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using BlockGlass.Core;

namespace BlockGlass.UI.Screens
{
    /// <summary>
    /// Splash screen with logo and liquid glass fade-in
    /// Duration under 1 second, no loading text, no progress bar
    /// </summary>
    public class SplashScreen : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private CanvasGroup canvasGroup;
        [SerializeField] private Image logoImage;
        [SerializeField] private Image glassOverlay;

        [Header("Timing")]
        [SerializeField] private float fadeInDuration = 0.3f;
        [SerializeField] private float holdDuration = 0.3f;
        [SerializeField] private float fadeOutDuration = 0.2f;

        [Header("Animation")]
        [SerializeField] private float logoScaleStart = 0.8f;
        [SerializeField] private AnimationCurve scaleCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);

        private ScreenManager screenManager;

        private void OnEnable()
        {
            screenManager = FindObjectOfType<ScreenManager>();
            StartCoroutine(PlaySplashSequence());
        }

        private IEnumerator PlaySplashSequence()
        {
            // Initialize state
            if (canvasGroup != null)
            {
                canvasGroup.alpha = 0f;
            }

            if (logoImage != null)
            {
                logoImage.transform.localScale = Vector3.one * logoScaleStart;
            }

            if (glassOverlay != null)
            {
                Color overlayColor = ColorPalette.GetGlassColor(0.85f);
                overlayColor.a = 0f;
                glassOverlay.color = overlayColor;
            }

            // Fade in
            yield return StartCoroutine(FadeIn());

            // Hold
            yield return new WaitForSeconds(holdDuration);

            // Fade out and transition
            yield return StartCoroutine(FadeOut());

            // Transition to dashboard
            GameManager.Instance?.SetState(GameState.Menu);
            screenManager?.ShowScreen(ScreenType.Dashboard);
        }

        private IEnumerator FadeIn()
        {
            float elapsed = 0f;

            while (elapsed < fadeInDuration)
            {
                elapsed += Time.deltaTime;
                float t = scaleCurve.Evaluate(elapsed / fadeInDuration);

                if (canvasGroup != null)
                {
                    canvasGroup.alpha = t;
                }

                if (logoImage != null)
                {
                    float scale = Mathf.Lerp(logoScaleStart, 1f, t);
                    logoImage.transform.localScale = Vector3.one * scale;
                }

                if (glassOverlay != null)
                {
                    Color color = glassOverlay.color;
                    color.a = t * 0.85f;
                    glassOverlay.color = color;
                }

                yield return null;
            }

            if (canvasGroup != null) canvasGroup.alpha = 1f;
            if (logoImage != null) logoImage.transform.localScale = Vector3.one;
        }

        private IEnumerator FadeOut()
        {
            float elapsed = 0f;
            float startAlpha = canvasGroup != null ? canvasGroup.alpha : 1f;

            while (elapsed < fadeOutDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / fadeOutDuration;

                if (canvasGroup != null)
                {
                    canvasGroup.alpha = Mathf.Lerp(startAlpha, 0f, t);
                }

                yield return null;
            }

            if (canvasGroup != null) canvasGroup.alpha = 0f;
            gameObject.SetActive(false);
        }
    }
}
