using UnityEngine;
using System.Collections.Generic;

namespace BlockGlass.Core
{
    /// <summary>
    /// Audio management with music/SFX toggles and pooling
    /// </summary>
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        [Header("Audio Sources")]
        [SerializeField] private AudioSource musicSource;
        [SerializeField] private AudioSource sfxSource;

        [Header("Audio Clips")]
        [SerializeField] private AudioClip backgroundMusic;
        [SerializeField] private AudioClip blockPlaceSound;
        [SerializeField] private AudioClip lineClearSound;
        [SerializeField] private AudioClip comboSound;
        [SerializeField] private AudioClip gameOverSound;
        [SerializeField] private AudioClip buttonClickSound;
        [SerializeField] private AudioClip helperUseSound;

        [Header("Settings")]
        [SerializeField] private float musicVolume = 0.5f;
        [SerializeField] private float sfxVolume = 0.8f;

        private bool musicEnabled = true;
        private bool sfxEnabled = true;
        private bool vibrationEnabled = true;

        private List<AudioSource> sfxPool = new List<AudioSource>();
        private const int POOL_SIZE = 5;

        public bool MusicEnabled => musicEnabled;
        public bool SfxEnabled => sfxEnabled;
        public bool VibrationEnabled => vibrationEnabled;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            InitializeSfxPool();
            LoadSettings();
        }

        public static void Initialize()
        {
            // Called by GameManager to ensure AudioManager is ready
            if (Instance != null)
            {
                Instance.ApplySettings();
            }
        }

        private void InitializeSfxPool()
        {
            for (int i = 0; i < POOL_SIZE; i++)
            {
                AudioSource source = gameObject.AddComponent<AudioSource>();
                source.playOnAwake = false;
                sfxPool.Add(source);
            }
        }

        private void LoadSettings()
        {
            musicEnabled = SaveSystem.GetBool("MusicEnabled", true);
            sfxEnabled = SaveSystem.GetBool("SfxEnabled", true);
            vibrationEnabled = SaveSystem.GetBool("VibrationEnabled", true);
            ApplySettings();
        }

        private void ApplySettings()
        {
            if (musicSource != null)
            {
                musicSource.volume = musicEnabled ? musicVolume : 0f;
            }
        }

        public void ToggleMusic(bool enabled)
        {
            musicEnabled = enabled;
            SaveSystem.SetBool("MusicEnabled", enabled);

            if (musicSource != null)
            {
                musicSource.volume = enabled ? musicVolume : 0f;
            }
        }

        public void ToggleSfx(bool enabled)
        {
            sfxEnabled = enabled;
            SaveSystem.SetBool("SfxEnabled", enabled);
        }

        public void ToggleVibration(bool enabled)
        {
            vibrationEnabled = enabled;
            SaveSystem.SetBool("VibrationEnabled", enabled);
        }

        public void PlayMusic()
        {
            if (musicSource != null && backgroundMusic != null)
            {
                musicSource.clip = backgroundMusic;
                musicSource.loop = true;
                musicSource.Play();
            }
        }

        public void StopMusic()
        {
            if (musicSource != null)
            {
                musicSource.Stop();
            }
        }

        public void PlaySfx(SoundType soundType)
        {
            if (!sfxEnabled) return;

            AudioClip clip = GetClipForType(soundType);
            if (clip == null) return;

            AudioSource source = GetAvailableSfxSource();
            if (source != null)
            {
                source.volume = sfxVolume;
                source.PlayOneShot(clip);
            }
        }

        private AudioClip GetClipForType(SoundType type)
        {
            return type switch
            {
                SoundType.BlockPlace => blockPlaceSound,
                SoundType.LineClear => lineClearSound,
                SoundType.Combo => comboSound,
                SoundType.GameOver => gameOverSound,
                SoundType.ButtonClick => buttonClickSound,
                SoundType.HelperUse => helperUseSound,
                _ => null
            };
        }

        private AudioSource GetAvailableSfxSource()
        {
            foreach (var source in sfxPool)
            {
                if (!source.isPlaying)
                {
                    return source;
                }
            }
            return sfxPool[0]; // Fallback to first source
        }

        public void Vibrate(VibrationType type = VibrationType.Light)
        {
            if (!vibrationEnabled) return;

#if UNITY_ANDROID && !UNITY_EDITOR
            switch (type)
            {
                case VibrationType.Light:
                    Handheld.Vibrate();
                    break;
                case VibrationType.Medium:
                    Handheld.Vibrate();
                    break;
                case VibrationType.Heavy:
                    Handheld.Vibrate();
                    break;
            }
#endif
        }
    }

    public enum SoundType
    {
        BlockPlace,
        LineClear,
        Combo,
        GameOver,
        ButtonClick,
        HelperUse
    }

    public enum VibrationType
    {
        Light,
        Medium,
        Heavy
    }
}
