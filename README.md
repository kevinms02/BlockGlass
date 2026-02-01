# BlockGlass! 🎮

A casual 2D block puzzle mobile game built with Unity - Block Blast-style mechanics with a premium Liquid Glass UI system.

## 🎯 Core Principles

- **Fairness First**: No pay-to-win. Money removes friction, NOT challenge.
- **Offline-First**: Fully playable without internet.
- **Guest-Friendly**: No login required. Optional account for sync.

## 📱 Platforms

- **Primary**: Android
- **Compatible**: iOS (no refactor needed)

## 🛠️ Requirements

- Unity 2022.3 LTS or later
- Android Build Support module
- iOS Build Support module (for iOS builds)
- TextMeshPro (included via Package Manager)

## 📂 Project Structure

```
Assets/
├── Scripts/
│   ├── Core/           # GameManager, ScreenManager, AudioManager, SaveSystem
│   ├── Gameplay/       # GridManager, BlockSpawner, ScoreManager, HelperSystem
│   ├── UI/             # ColorPalette, GlassPanel, GlassButton
│   │   └── Screens/    # All screen controllers
│   ├── Ads/            # AdManager (AdMob integration)
│   └── Subscriptions/  # SubscriptionManager (IAP)
├── ScriptableObjects/
│   └── Shapes/         # Block shape definitions
├── Materials/          # LiquidGlass shader and materials
├── Prefabs/           # UI and gameplay prefabs (create in Unity)
├── Scenes/
│   ├── Boot.unity     # Startup scene
│   └── Main.unity     # Main game scene
└── Art/               # Sprites, icons (add your assets)
```

## 🚀 Getting Started

### 1. Open in Unity
1. Open Unity Hub
2. Click "Add project from disk"
3. Select the `BlockGlass!` folder
4. Open with Unity 2022.3+

### 2. Create Scenes
After opening, create two scenes:
- `Assets/Scenes/Boot.unity` - Add BootLoader component
- `Assets/Scenes/Main.unity` - Main game scene with all UI

### 3. Generate Block Shapes
In Unity Editor:
- Go to menu: **BlockGlass → Create Default Shapes**
- This creates all block shape ScriptableObjects

### 4. Setup Prefabs
Create prefabs for:
- Grid cell sprite
- Block sprite
- UI panels with GlassPanel component

### 5. Configure AdMob (Optional)
1. Import Google Mobile Ads Unity Plugin
2. Replace test Ad Unit IDs in `AdManager.cs` with production IDs

## 🎮 Game Features

### Gameplay
- **8x8 Grid**: Standard block placement grid
- **Line Clearing**: Complete rows/columns to clear
- **Combo System**: Score multipliers for chain clears

### Helper Tools
| Helper | Free Uses | Max Uses | Effect |
|--------|-----------|----------|--------|
| Bomb | 1 | 3 | Clears 3x3 area |
| Single Block | 1 | 3 | Adds 1x1 block |
| Undo | 1 | 3 | Reverts last move |

**Rules**: Helpers NEVER modify score.

### Fairness System
- ✅ At least one valid move always exists
- ✅ Emergency easy shapes at 70%+ grid fill
- ✅ Maximum one hard shape per spawn batch
- ✅ Deadlocks only from player decisions

## 💰 Monetization

### Subscription Tiers
| Tier | Price | Benefits |
|------|-------|----------|
| Free | $0 | Full game with ads |
| Lite | $0.99/wk | No interstitial ads |
| Pro | $2.99/wk | No ads + free helpers |
| Premium | $4.99/wk | All Pro + cosmetics |

**Philosophy**: Subscriptions remove friction, not challenge.

### Ad Placements
- **Rewarded**: Optional, for helper refills
- **Interstitial**: Game over only, skipped for Lite+
- **No ads**: During active gameplay

## 🎨 Liquid Glass UI

### Where Glass IS Used
- Top bars, bottom navigation
- Modals, side panels
- Subscription cards

### Where Glass is NOT Used
- Gameplay grid
- Blocks
- Score popups

### Color Palette (Aqua Accent)
```csharp
BackgroundDark = (0.05, 0.07, 0.12)   // Deep navy
Accent = (0.20, 0.85, 0.90)           // Aqua
Success = (0.30, 0.90, 0.75)          // Bright aqua-green
Warning = (0.85, 0.65, 0.35)          // Muted orange
Error = (0.75, 0.35, 0.35)            // Muted red
```

## 📋 Screens

1. **Splash** - Logo fade-in (<1 second)
2. **Dashboard** - Classic/Adventure mode selection
3. **Gameplay** - Grid, score, helper tray
4. **Game Over** - Calm modal, continue/restart
5. **Profile** - Guest/logged-in views
6. **Settings** - Audio, vibration, links
7. **Subscription** - Tier comparison

## 🔧 Technical Notes

### Namespace Structure
All scripts use `BlockGlass.*` namespaces:
- `BlockGlass.Core`
- `BlockGlass.Gameplay`
- `BlockGlass.UI`
- `BlockGlass.UI.Screens`
- `BlockGlass.Ads`
- `BlockGlass.Subscriptions`

### Save System
Uses `PlayerPrefs` for offline-first persistence:
- High scores (per mode)
- Settings (audio, vibration)
- Subscription status
- Game statistics

## 📄 License

Copyright © 2024 BlockGlass Studio. All rights reserved.

---

**Built as a shipping-ready MVP foundation. Scale confidently after launch.**
