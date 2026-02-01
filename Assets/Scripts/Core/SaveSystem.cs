using UnityEngine;

namespace BlockGlass.Core
{
    /// <summary>
    /// Offline-first save system using PlayerPrefs
    /// Handles high scores, settings, and game state persistence
    /// </summary>
    public static class SaveSystem
    {
        private const string KEY_HIGH_SCORE_CLASSIC = "HighScore_Classic";
        private const string KEY_HIGH_SCORE_ADVENTURE = "HighScore_Adventure";
        private const string KEY_ADVENTURE_LEVEL = "Adventure_Level";
        private const string KEY_TOTAL_GAMES_PLAYED = "TotalGamesPlayed";
        private const string KEY_TOTAL_LINES_CLEARED = "TotalLinesCleared";
        private const string KEY_SUBSCRIPTION_TIER = "SubscriptionTier";
        private const string KEY_IS_GUEST = "IsGuest";
        private const string KEY_USERNAME = "Username";

        public static void Initialize()
        {
            // Ensure default values exist
            if (!PlayerPrefs.HasKey(KEY_IS_GUEST))
            {
                PlayerPrefs.SetInt(KEY_IS_GUEST, 1);
            }
            if (!PlayerPrefs.HasKey(KEY_SUBSCRIPTION_TIER))
            {
                PlayerPrefs.SetInt(KEY_SUBSCRIPTION_TIER, 0); // Free tier
            }
        }

        public static void SaveAll()
        {
            PlayerPrefs.Save();
        }

        #region Score Management

        public static int GetHighScore(GameMode mode)
        {
            string key = mode == GameMode.Classic ? KEY_HIGH_SCORE_CLASSIC : KEY_HIGH_SCORE_ADVENTURE;
            return PlayerPrefs.GetInt(key, 0);
        }

        public static void SetHighScore(GameMode mode, int score)
        {
            string key = mode == GameMode.Classic ? KEY_HIGH_SCORE_CLASSIC : KEY_HIGH_SCORE_ADVENTURE;
            int currentHigh = GetHighScore(mode);
            
            if (score > currentHigh)
            {
                PlayerPrefs.SetInt(key, score);
                PlayerPrefs.Save();
            }
        }

        public static bool IsNewHighScore(GameMode mode, int score)
        {
            return score > GetHighScore(mode);
        }

        #endregion

        #region Adventure Progress

        public static int GetAdventureLevel()
        {
            return PlayerPrefs.GetInt(KEY_ADVENTURE_LEVEL, 1);
        }

        public static void SetAdventureLevel(int level)
        {
            PlayerPrefs.SetInt(KEY_ADVENTURE_LEVEL, level);
            PlayerPrefs.Save();
        }

        #endregion

        #region Statistics

        public static int GetTotalGamesPlayed()
        {
            return PlayerPrefs.GetInt(KEY_TOTAL_GAMES_PLAYED, 0);
        }

        public static void IncrementGamesPlayed()
        {
            int current = GetTotalGamesPlayed();
            PlayerPrefs.SetInt(KEY_TOTAL_GAMES_PLAYED, current + 1);
        }

        public static int GetTotalLinesCleared()
        {
            return PlayerPrefs.GetInt(KEY_TOTAL_LINES_CLEARED, 0);
        }

        public static void AddLinesCleared(int lines)
        {
            int current = GetTotalLinesCleared();
            PlayerPrefs.SetInt(KEY_TOTAL_LINES_CLEARED, current + lines);
        }

        #endregion

        #region User Profile

        public static bool IsGuest()
        {
            return PlayerPrefs.GetInt(KEY_IS_GUEST, 1) == 1;
        }

        public static void SetGuest(bool isGuest)
        {
            PlayerPrefs.SetInt(KEY_IS_GUEST, isGuest ? 1 : 0);
            PlayerPrefs.Save();
        }

        public static string GetUsername()
        {
            return PlayerPrefs.GetString(KEY_USERNAME, "Guest");
        }

        public static void SetUsername(string username)
        {
            PlayerPrefs.SetString(KEY_USERNAME, username);
            PlayerPrefs.Save();
        }

        #endregion

        #region Subscription

        public static SubscriptionTier GetSubscriptionTier()
        {
            return (SubscriptionTier)PlayerPrefs.GetInt(KEY_SUBSCRIPTION_TIER, 0);
        }

        public static void SetSubscriptionTier(SubscriptionTier tier)
        {
            PlayerPrefs.SetInt(KEY_SUBSCRIPTION_TIER, (int)tier);
            PlayerPrefs.Save();
        }

        public static bool HasNoAds()
        {
            return GetSubscriptionTier() >= SubscriptionTier.Lite;
        }

        public static bool HasFreeHelpers()
        {
            return GetSubscriptionTier() >= SubscriptionTier.Pro;
        }

        public static bool HasPremiumCosmetics()
        {
            return GetSubscriptionTier() >= SubscriptionTier.Premium;
        }

        #endregion

        #region Generic Helpers

        public static bool GetBool(string key, bool defaultValue = false)
        {
            return PlayerPrefs.GetInt(key, defaultValue ? 1 : 0) == 1;
        }

        public static void SetBool(string key, bool value)
        {
            PlayerPrefs.SetInt(key, value ? 1 : 0);
            PlayerPrefs.Save();
        }

        public static int GetInt(string key, int defaultValue = 0)
        {
            return PlayerPrefs.GetInt(key, defaultValue);
        }

        public static void SetInt(string key, int value)
        {
            PlayerPrefs.SetInt(key, value);
            PlayerPrefs.Save();
        }

        public static string GetString(string key, string defaultValue = "")
        {
            return PlayerPrefs.GetString(key, defaultValue);
        }

        public static void SetString(string key, string value)
        {
            PlayerPrefs.SetString(key, value);
            PlayerPrefs.Save();
        }

        public static void DeleteKey(string key)
        {
            PlayerPrefs.DeleteKey(key);
        }

        public static void ClearAll()
        {
            PlayerPrefs.DeleteAll();
            PlayerPrefs.Save();
        }

        #endregion
    }

    public enum SubscriptionTier
    {
        Free = 0,
        Lite = 1,      // Removes interstitial ads
        Pro = 2,       // No ads + free helpers
        Premium = 3    // All Pro benefits + cosmetics
    }
}
