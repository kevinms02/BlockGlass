# BlockGlass! Unity Project

## Quick Start Commands (Run in Unity Editor)

After opening this project in Unity 2022.3+, run these menu commands:

### 1. Generate Sprites
**Menu**: `BlockGlass → Generate Sprites`

Creates all placeholder sprite assets:
- Cell and Block sprites (with rounded corners)
- Multiple block color variants (Aqua, Purple, Orange, Green, Pink, Yellow)
- UI sprites (GlassPanel, Button)
- Icon sprites (Bomb, Undo, Single)

### 2. Create Block Shapes
**Menu**: `BlockGlass → Create Default Shapes`

Creates all ScriptableObject block shapes:
- Single (1x1) - Difficulty: 1
- Line2, Line3, Line4, Line5 - Difficulty: 2-7
- Square 2x2, 3x3 - Difficulty: 3, 8
- L-Shape, T-Shape, S-Shape, Z-Shape - Difficulty: 4-6
- Corner, BigL - Difficulty: 2, 7

### 3. Setup Main Scene
**Menu**: `BlockGlass → Setup Main Scene`

Automatically creates the complete Main scene with:
- All manager GameObjects (GameManager, AudioManager, etc.)
- UI Canvas with all screens (Splash, Dashboard, Gameplay, etc.)
- Gameplay objects (GridManager, BlockSpawner, etc.)
- Properly structured hierarchy

### 4. Create Prefabs
**Menu**: `BlockGlass → Create Prefabs`

Creates gameplay prefabs:
- Cell.prefab
- Block.prefab
- BlockPreview.prefab

---

## After Running Commands

1. Open `Assets/Scenes/Boot.unity` 
2. Press Play to test the game flow
3. Wire up any missing references in the Inspector
4. Build for Android: `File → Build Settings → Android → Build`

## AdMob Setup

1. Import Google Mobile Ads Unity Plugin:
   https://github.com/googleads/googleads-mobile-unity/releases

2. Replace test Ad Unit IDs in `Assets/Scripts/Ads/AdManager.cs`:
   - `rewardedAdUnitId` 
   - `interstitialAdUnitId`

3. Replace App ID in `Assets/Plugins/Android/AndroidManifest.xml`:
   - `com.google.android.gms.ads.APPLICATION_ID`

---

## Troubleshooting

**Missing TextMeshPro?**
- Window → TextMeshPro → Import TMP Essential Resources

**Scripts not compiling?**
- Ensure Unity 2022.3+ is used
- Check Console for specific errors

**Scenes missing components?**
- Run the "Setup Main Scene" command again
- Manually add components if needed
