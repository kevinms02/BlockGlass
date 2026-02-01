using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
#endif

namespace BlockGlass.Art
{
    /// <summary>
    /// Generates basic sprite assets for the game
    /// Creates simple square sprites for cells and blocks
    /// Run from Unity Editor menu: BlockGlass → Generate Sprites
    /// </summary>
    public static class SpriteGenerator
    {
#if UNITY_EDITOR
        [MenuItem("BlockGlass/Generate Sprites")]
        public static void GenerateSprites()
        {
            // Ensure directories exist
            if (!AssetDatabase.IsValidFolder("Assets/Art"))
            {
                AssetDatabase.CreateFolder("Assets", "Art");
            }
            if (!AssetDatabase.IsValidFolder("Assets/Art/Sprites"))
            {
                AssetDatabase.CreateFolder("Assets/Art", "Sprites");
            }

            // Generate cell sprite (64x64 with rounded corners simulation)
            CreateSquareSprite("Cell", 64, new Color(0.15f, 0.18f, 0.24f, 1f), "Assets/Art/Sprites/Cell.png");

            // Generate block sprite (64x64, solid)
            CreateSquareSprite("Block", 64, new Color(0.2f, 0.85f, 0.9f, 1f), "Assets/Art/Sprites/Block.png");

            // Generate various block colors
            Color[] blockColors = new Color[]
            {
                new Color(0.2f, 0.85f, 0.9f, 1f),   // Aqua
                new Color(0.55f, 0.35f, 0.9f, 1f), // Purple
                new Color(0.9f, 0.55f, 0.3f, 1f),  // Orange
                new Color(0.35f, 0.8f, 0.5f, 1f),  // Green
                new Color(0.9f, 0.45f, 0.55f, 1f), // Pink
                new Color(0.95f, 0.8f, 0.3f, 1f),  // Yellow
            };

            string[] colorNames = { "Aqua", "Purple", "Orange", "Green", "Pink", "Yellow" };

            for (int i = 0; i < blockColors.Length; i++)
            {
                CreateSquareSprite($"Block_{colorNames[i]}", 64, blockColors[i], $"Assets/Art/Sprites/Block_{colorNames[i]}.png");
            }

            // Generate UI sprites
            CreateSquareSprite("GlassPanel", 128, new Color(0.1f, 0.12f, 0.18f, 0.85f), "Assets/Art/Sprites/GlassPanel.png");
            CreateSquareSprite("Button", 128, new Color(0.2f, 0.85f, 0.9f, 0.9f), "Assets/Art/Sprites/Button.png");

            // Generate icons (simple placeholders)
            CreateSquareSprite("Icon_Bomb", 64, new Color(0.9f, 0.3f, 0.3f, 1f), "Assets/Art/Sprites/Icon_Bomb.png");
            CreateSquareSprite("Icon_Undo", 64, new Color(0.3f, 0.7f, 0.9f, 1f), "Assets/Art/Sprites/Icon_Undo.png");
            CreateSquareSprite("Icon_Single", 64, new Color(0.2f, 0.85f, 0.9f, 1f), "Assets/Art/Sprites/Icon_Single.png");

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("[SpriteGenerator] Generated sprites in Assets/Art/Sprites/");
        }

        private static void CreateSquareSprite(string name, int size, Color color, string path)
        {
            Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);

            // Simple square with slight corner rounding
            int cornerRadius = size / 8;

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    // Simple rounded corner check
                    bool inCorner = false;
                    float dist = 0;

                    // Top-left
                    if (x < cornerRadius && y < cornerRadius)
                    {
                        dist = Vector2.Distance(new Vector2(x, y), new Vector2(cornerRadius, cornerRadius));
                        inCorner = dist > cornerRadius;
                    }
                    // Top-right
                    else if (x >= size - cornerRadius && y < cornerRadius)
                    {
                        dist = Vector2.Distance(new Vector2(x, y), new Vector2(size - cornerRadius - 1, cornerRadius));
                        inCorner = dist > cornerRadius;
                    }
                    // Bottom-left
                    else if (x < cornerRadius && y >= size - cornerRadius)
                    {
                        dist = Vector2.Distance(new Vector2(x, y), new Vector2(cornerRadius, size - cornerRadius - 1));
                        inCorner = dist > cornerRadius;
                    }
                    // Bottom-right
                    else if (x >= size - cornerRadius && y >= size - cornerRadius)
                    {
                        dist = Vector2.Distance(new Vector2(x, y), new Vector2(size - cornerRadius - 1, size - cornerRadius - 1));
                        inCorner = dist > cornerRadius;
                    }

                    if (inCorner)
                    {
                        texture.SetPixel(x, y, Color.clear);
                    }
                    else
                    {
                        texture.SetPixel(x, y, color);
                    }
                }
            }

            texture.Apply();

            // Encode to PNG
            byte[] pngData = texture.EncodeToPNG();
            System.IO.File.WriteAllBytes(path, pngData);

            Object.DestroyImmediate(texture);

            // Import as sprite
            AssetDatabase.ImportAsset(path);
            TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer != null)
            {
                importer.textureType = TextureImporterType.Sprite;
                importer.spritePixelsPerUnit = 64;
                importer.filterMode = FilterMode.Bilinear;
                importer.SaveAndReimport();
            }
        }
#endif
    }
}
