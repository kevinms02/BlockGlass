using UnityEngine;
using BlockGlass.Core;

namespace BlockGlass.Gameplay
{
    /// <summary>
    /// Manages scoring with combo system and animations
    /// Score is NEVER modified by helpers or purchases
    /// </summary>
    public class ScoreManager : MonoBehaviour
    {
        public static ScoreManager Instance { get; private set; }

        [Header("Score Settings")]
        [SerializeField] private int pointsPerCell = 10;
        [SerializeField] private int pointsPerLine = 100;
        [SerializeField] private int comboMultiplierMax = 5;
        [SerializeField] private float comboResetTime = 3f;

        private int currentScore = 0;
        private int bestScore = 0;
        private int comboCount = 0;
        private float lastScoreTime = 0;

        public int CurrentScore => currentScore;
        public int BestScore => bestScore;
        public int ComboCount => comboCount;

        public event System.Action<int> OnScoreChanged;
        public event System.Action<int> OnComboChanged;
        public event System.Action OnNewHighScore;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        public void Initialize()
        {
            currentScore = 0;
            comboCount = 0;

            GameMode mode = GameManager.Instance?.CurrentMode ?? GameMode.Classic;
            bestScore = SaveSystem.GetHighScore(mode);

            OnScoreChanged?.Invoke(currentScore);
            OnComboChanged?.Invoke(comboCount);
        }

        public void AddPlacementScore(int cellCount)
        {
            int points = cellCount * pointsPerCell;
            AddScore(points);
        }

        public void AddLineClearScore(int linesCleared)
        {
            if (linesCleared <= 0) return;

            // Update combo
            UpdateCombo();

            // Calculate points with combo multiplier
            int basePoints = linesCleared * pointsPerLine;
            int multiplier = Mathf.Min(comboCount, comboMultiplierMax);
            int bonusMultiplier = linesCleared > 1 ? linesCleared : 1; // Bonus for multiple lines

            int totalPoints = basePoints * multiplier * bonusMultiplier;
            AddScore(totalPoints);

            // Play sound and haptics
            if (linesCleared > 1 || comboCount > 1)
            {
                AudioManager.Instance?.PlaySfx(SoundType.Combo);
            }
            else
            {
                AudioManager.Instance?.PlaySfx(SoundType.LineClear);
            }

            AudioManager.Instance?.Vibrate(VibrationType.Medium);

            // Track statistics
            SaveSystem.AddLinesCleared(linesCleared);
        }

        private void UpdateCombo()
        {
            float timeSinceLastScore = Time.time - lastScoreTime;

            if (timeSinceLastScore < comboResetTime)
            {
                comboCount++;
            }
            else
            {
                comboCount = 1;
            }

            lastScoreTime = Time.time;
            OnComboChanged?.Invoke(comboCount);
        }

        private void AddScore(int points)
        {
            currentScore += points;
            OnScoreChanged?.Invoke(currentScore);

            // Check for new high score
            GameMode mode = GameManager.Instance?.CurrentMode ?? GameMode.Classic;
            if (SaveSystem.IsNewHighScore(mode, currentScore))
            {
                bestScore = currentScore;
                SaveSystem.SetHighScore(mode, currentScore);
                OnNewHighScore?.Invoke();
            }
        }

        public void ResetCombo()
        {
            comboCount = 0;
            OnComboChanged?.Invoke(comboCount);
        }

        public void GameEnded()
        {
            // Final save
            GameMode mode = GameManager.Instance?.CurrentMode ?? GameMode.Classic;
            SaveSystem.SetHighScore(mode, currentScore);
            SaveSystem.IncrementGamesPlayed();

            AudioManager.Instance?.PlaySfx(SoundType.GameOver);
        }

        /// <summary>
        /// CRITICAL: This method ensures score is NEVER affected by helpers
        /// Helpers call this to verify they don't modify score
        /// </summary>
        public void VerifyNoScoreChange(int scoreBefore, int scoreAfter)
        {
            if (scoreBefore != scoreAfter)
            {
                Debug.LogError("[ScoreManager] FAIRNESS VIOLATION: Helper modified score!");
                // Restore original score
                currentScore = scoreBefore;
                OnScoreChanged?.Invoke(currentScore);
            }
        }
    }
}
