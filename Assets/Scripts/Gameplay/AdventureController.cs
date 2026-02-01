using UnityEngine;

namespace BlockGlass.Gameplay
{
    /// <summary>
    /// Adventure mode game controller
    /// Level-based progression with increasing difficulty
    /// </summary>
    public class AdventureController : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private GridManager gridManager;
        [SerializeField] private BlockSpawner blockSpawner;
        [SerializeField] private ScoreManager scoreManager;

        [Header("Level Settings")]
        [SerializeField] private int baseScoreGoal = 500;
        [SerializeField] private float scoreGoalMultiplier = 1.5f;
        [SerializeField] private int maxDifficultyLevel = 50;

        private int currentLevel = 1;
        private int currentLevelScore = 0;
        private int levelGoal = 500;

        public int CurrentLevel => currentLevel;
        public int CurrentLevelScore => currentLevelScore;
        public int LevelGoal => levelGoal;
        public float LevelProgress => (float)currentLevelScore / levelGoal;

        public event System.Action<int> OnLevelStarted;
        public event System.Action<int> OnLevelCompleted;
        public event System.Action<float> OnProgressUpdated;

        public void Initialize()
        {
            currentLevel = Core.SaveSystem.GetAdventureLevel();
            CalculateLevelGoal();
            currentLevelScore = 0;

            OnLevelStarted?.Invoke(currentLevel);
        }

        public void AddScore(int points)
        {
            currentLevelScore += points;
            OnProgressUpdated?.Invoke(LevelProgress);

            if (currentLevelScore >= levelGoal)
            {
                CompleteLevel();
            }
        }

        private void CompleteLevel()
        {
            OnLevelCompleted?.Invoke(currentLevel);

            currentLevel++;
            Core.SaveSystem.SetAdventureLevel(currentLevel);

            // Small delay before next level
            StartCoroutine(StartNextLevel());
        }

        private System.Collections.IEnumerator StartNextLevel()
        {
            yield return new WaitForSeconds(1f);

            currentLevelScore = 0;
            CalculateLevelGoal();

            // Increase difficulty
            ApplyDifficultyModifiers();

            OnLevelStarted?.Invoke(currentLevel);
        }

        private void CalculateLevelGoal()
        {
            levelGoal = Mathf.RoundToInt(baseScoreGoal * Mathf.Pow(scoreGoalMultiplier, currentLevel - 1));
        }

        private void ApplyDifficultyModifiers()
        {
            // As levels increase, spawn harder shapes more often
            // But fairness rules still apply (always valid move)
            float difficultyFactor = Mathf.Min(currentLevel / (float)maxDifficultyLevel, 1f);

            // Could modify spawner settings based on difficulty
            Debug.Log($"[Adventure] Level {currentLevel} started, difficulty: {difficultyFactor:P0}");
        }
    }
}
