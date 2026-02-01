using UnityEngine;
using System.Collections;
using System.Collections.Generic;

namespace BlockGlass.Core
{
    /// <summary>
    /// Manages UI screen transitions with liquid glass effects
    /// </summary>
    public class ScreenManager : MonoBehaviour
    {
        [Header("Screen References")]
        [SerializeField] private CanvasGroup splashScreen;
        [SerializeField] private CanvasGroup dashboardScreen;
        [SerializeField] private CanvasGroup gameplayScreen;
        [SerializeField] private CanvasGroup profileScreen;
        [SerializeField] private CanvasGroup settingsScreen;
        [SerializeField] private CanvasGroup subscriptionScreen;

        [Header("Modal References")]
        [SerializeField] private CanvasGroup gameOverModal;
        [SerializeField] private CanvasGroup pauseModal;
        [SerializeField] private CanvasGroup subscriptionUpsellModal;

        [Header("Transition Settings")]
        [SerializeField] private float transitionDuration = 0.3f;
        [SerializeField] private AnimationCurve transitionCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);

        private Dictionary<ScreenType, CanvasGroup> screens;
        private Dictionary<ModalType, CanvasGroup> modals;
        private ScreenType currentScreen = ScreenType.Splash;
        private Stack<ModalType> modalStack = new Stack<ModalType>();

        private Coroutine currentTransition;

        private void Awake()
        {
            InitializeScreenDictionaries();
        }

        private void InitializeScreenDictionaries()
        {
            screens = new Dictionary<ScreenType, CanvasGroup>
            {
                { ScreenType.Splash, splashScreen },
                { ScreenType.Dashboard, dashboardScreen },
                { ScreenType.Gameplay, gameplayScreen },
                { ScreenType.Profile, profileScreen },
                { ScreenType.Settings, settingsScreen },
                { ScreenType.Subscription, subscriptionScreen }
            };

            modals = new Dictionary<ModalType, CanvasGroup>
            {
                { ModalType.GameOver, gameOverModal },
                { ModalType.Pause, pauseModal },
                { ModalType.SubscriptionUpsell, subscriptionUpsellModal }
            };

            // Initialize all screens to hidden except splash
            foreach (var screen in screens.Values)
            {
                if (screen != null)
                {
                    SetCanvasGroupState(screen, false);
                }
            }

            foreach (var modal in modals.Values)
            {
                if (modal != null)
                {
                    SetCanvasGroupState(modal, false);
                }
            }
        }

        public void ShowScreen(ScreenType screenType)
        {
            if (!screens.ContainsKey(screenType) || screens[screenType] == null)
            {
                Debug.LogWarning($"[ScreenManager] Screen {screenType} not assigned");
                return;
            }

            if (currentTransition != null)
            {
                StopCoroutine(currentTransition);
            }

            currentTransition = StartCoroutine(TransitionToScreen(screenType));
        }

        private IEnumerator TransitionToScreen(ScreenType newScreen)
        {
            CanvasGroup oldScreenGroup = screens.ContainsKey(currentScreen) ? screens[currentScreen] : null;
            CanvasGroup newScreenGroup = screens[newScreen];

            // Fade out old screen
            if (oldScreenGroup != null)
            {
                yield return StartCoroutine(FadeCanvasGroup(oldScreenGroup, 1f, 0f));
                SetCanvasGroupState(oldScreenGroup, false);
            }

            // Fade in new screen
            SetCanvasGroupState(newScreenGroup, true);
            newScreenGroup.alpha = 0f;
            yield return StartCoroutine(FadeCanvasGroup(newScreenGroup, 0f, 1f));

            currentScreen = newScreen;
            currentTransition = null;
        }

        public void ShowModal(ModalType modalType)
        {
            if (!modals.ContainsKey(modalType) || modals[modalType] == null)
            {
                Debug.LogWarning($"[ScreenManager] Modal {modalType} not assigned");
                return;
            }

            CanvasGroup modal = modals[modalType];
            modalStack.Push(modalType);
            StartCoroutine(FadeInModal(modal));
        }

        public void HideCurrentModal()
        {
            if (modalStack.Count == 0) return;

            ModalType currentModal = modalStack.Pop();
            if (modals.ContainsKey(currentModal) && modals[currentModal] != null)
            {
                StartCoroutine(FadeOutModal(modals[currentModal]));
            }
        }

        public void HideAllModals()
        {
            while (modalStack.Count > 0)
            {
                ModalType modalType = modalStack.Pop();
                if (modals.ContainsKey(modalType) && modals[modalType] != null)
                {
                    SetCanvasGroupState(modals[modalType], false);
                }
            }
        }

        private IEnumerator FadeInModal(CanvasGroup modal)
        {
            SetCanvasGroupState(modal, true);
            modal.alpha = 0f;
            yield return StartCoroutine(FadeCanvasGroup(modal, 0f, 1f));
        }

        private IEnumerator FadeOutModal(CanvasGroup modal)
        {
            yield return StartCoroutine(FadeCanvasGroup(modal, 1f, 0f));
            SetCanvasGroupState(modal, false);
        }

        private IEnumerator FadeCanvasGroup(CanvasGroup group, float from, float to)
        {
            float elapsed = 0f;
            group.alpha = from;

            while (elapsed < transitionDuration)
            {
                elapsed += Time.unscaledDeltaTime;
                float t = transitionCurve.Evaluate(elapsed / transitionDuration);
                group.alpha = Mathf.Lerp(from, to, t);
                yield return null;
            }

            group.alpha = to;
        }

        private void SetCanvasGroupState(CanvasGroup group, bool active)
        {
            if (group == null) return;

            group.gameObject.SetActive(active);
            group.alpha = active ? 1f : 0f;
            group.interactable = active;
            group.blocksRaycasts = active;
        }

        /// <summary>
        /// Special splash screen transition with liquid glass fade
        /// </summary>
        public IEnumerator PlaySplashTransition(float duration = 0.8f)
        {
            if (splashScreen == null) yield break;

            SetCanvasGroupState(splashScreen, true);
            splashScreen.alpha = 0f;

            // Fade in
            float fadeInDuration = duration * 0.4f;
            yield return StartCoroutine(FadeCanvasGroup(splashScreen, 0f, 1f));

            // Hold
            yield return new WaitForSeconds(duration * 0.2f);

            // Fade out and transition to dashboard
            ShowScreen(ScreenType.Dashboard);
        }
    }
}
