using UnityEngine;
using UnityEngine.SceneManagement;

namespace BlockGlass.Core
{
    /// <summary>
    /// Singleton game state manager - coordinates all game systems
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Game State")]
        public GameState CurrentState { get; private set; } = GameState.Splash;
        public GameMode CurrentMode { get; private set; } = GameMode.Classic;

        [Header("References")]
        [SerializeField] private ScreenManager screenManager;

        public event System.Action<GameState> OnStateChanged;
        public event System.Action<GameMode> OnModeChanged;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            InitializeSystems();
        }

        private void InitializeSystems()
        {
            // Initialize save system first
            SaveSystem.Initialize();

            // Initialize audio
            AudioManager.Initialize();

            Debug.Log("[GameManager] Systems initialized");
        }

        public void SetState(GameState newState)
        {
            if (CurrentState == newState) return;

            GameState previousState = CurrentState;
            CurrentState = newState;

            Debug.Log($"[GameManager] State changed: {previousState} -> {newState}");
            OnStateChanged?.Invoke(newState);
        }

        public void SetGameMode(GameMode mode)
        {
            CurrentMode = mode;
            OnModeChanged?.Invoke(mode);
        }

        public void StartGame(GameMode mode)
        {
            SetGameMode(mode);
            SetState(GameState.Playing);

            if (screenManager != null)
            {
                screenManager.ShowScreen(ScreenType.Gameplay);
            }
        }

        public void PauseGame()
        {
            if (CurrentState == GameState.Playing)
            {
                SetState(GameState.Paused);
                Time.timeScale = 0f;
            }
        }

        public void ResumeGame()
        {
            if (CurrentState == GameState.Paused)
            {
                SetState(GameState.Playing);
                Time.timeScale = 1f;
            }
        }

        public void GameOver()
        {
            SetState(GameState.GameOver);
            Time.timeScale = 1f;

            if (screenManager != null)
            {
                screenManager.ShowModal(ModalType.GameOver);
            }
        }

        public void RestartGame()
        {
            Time.timeScale = 1f;
            StartGame(CurrentMode);
        }

        public void ReturnToMenu()
        {
            Time.timeScale = 1f;
            SetState(GameState.Menu);

            if (screenManager != null)
            {
                screenManager.ShowScreen(ScreenType.Dashboard);
            }
        }

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus && CurrentState == GameState.Playing)
            {
                PauseGame();
            }
        }

        private void OnApplicationQuit()
        {
            SaveSystem.SaveAll();
        }
    }

    public enum GameState
    {
        Splash,
        Menu,
        Playing,
        Paused,
        GameOver
    }

    public enum GameMode
    {
        Classic,
        Adventure
    }

    public enum ScreenType
    {
        Splash,
        Dashboard,
        Gameplay,
        Profile,
        Settings,
        Subscription
    }

    public enum ModalType
    {
        GameOver,
        Pause,
        SubscriptionUpsell,
        Settings
    }
}
