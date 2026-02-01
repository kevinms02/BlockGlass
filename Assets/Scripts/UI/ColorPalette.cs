using UnityEngine;

namespace BlockGlass.UI
{
    /// <summary>
    /// Strict color palette for BlockGlass! Liquid Glass UI
    /// Aqua accent with dark gradient backgrounds
    /// </summary>
    public static class ColorPalette
    {
        // ══════════════════════════════════════════════════════════════
        // BACKGROUND COLORS (Dark gradient)
        // ══════════════════════════════════════════════════════════════
        public static readonly Color BackgroundDark = new Color(0.05f, 0.07f, 0.12f, 1f);      // Deep navy
        public static readonly Color BackgroundMid = new Color(0.08f, 0.10f, 0.16f, 1f);       // Dark blue-grey
        public static readonly Color BackgroundLight = new Color(0.12f, 0.14f, 0.20f, 1f);     // Charcoal

        // ══════════════════════════════════════════════════════════════
        // ACCENT COLOR - AQUA (Primary)
        // ══════════════════════════════════════════════════════════════
        public static readonly Color Accent = new Color(0.20f, 0.85f, 0.90f, 1f);              // Aqua
        public static readonly Color AccentBright = new Color(0.30f, 0.95f, 1.00f, 1f);        // Bright aqua
        public static readonly Color AccentDim = new Color(0.15f, 0.60f, 0.65f, 1f);           // Dim aqua

        // ══════════════════════════════════════════════════════════════
        // SEMANTIC COLORS
        // ══════════════════════════════════════════════════════════════
        public static readonly Color Success = new Color(0.30f, 0.90f, 0.75f, 1f);             // Bright aqua-green
        public static readonly Color Warning = new Color(0.85f, 0.65f, 0.35f, 1f);             // Muted warm orange
        public static readonly Color Error = new Color(0.75f, 0.35f, 0.35f, 1f);               // Muted red

        // ══════════════════════════════════════════════════════════════
        // GLASS MATERIAL COLORS
        // ══════════════════════════════════════════════════════════════
        public static readonly Color GlassBase = new Color(0.10f, 0.12f, 0.18f, 0.85f);        // 85% opacity
        public static readonly Color GlassBorder = new Color(0.25f, 0.28f, 0.35f, 0.6f);       // Inner stroke
        public static readonly Color GlassHighlight = new Color(1f, 1f, 1f, 0.05f);            // Subtle top highlight

        // ══════════════════════════════════════════════════════════════
        // TEXT COLORS
        // ══════════════════════════════════════════════════════════════
        public static readonly Color TextPrimary = new Color(0.95f, 0.96f, 0.98f, 1f);         // Near white
        public static readonly Color TextSecondary = new Color(0.65f, 0.68f, 0.75f, 1f);       // Muted
        public static readonly Color TextDisabled = new Color(0.40f, 0.42f, 0.48f, 1f);        // Dim

        // ══════════════════════════════════════════════════════════════
        // GRID & BLOCK COLORS (Non-glass, high contrast)
        // ══════════════════════════════════════════════════════════════
        public static readonly Color GridCell = new Color(0.15f, 0.18f, 0.24f, 1f);            // Empty cell
        public static readonly Color GridCellHover = new Color(0.20f, 0.23f, 0.30f, 1f);       // Hover state

        // Block colors for variety (non-glass)
        public static readonly Color[] BlockColors = new Color[]
        {
            new Color(0.20f, 0.85f, 0.90f, 1f),  // Aqua
            new Color(0.55f, 0.35f, 0.90f, 1f),  // Purple
            new Color(0.90f, 0.55f, 0.30f, 1f),  // Orange
            new Color(0.35f, 0.80f, 0.50f, 1f),  // Green
            new Color(0.90f, 0.45f, 0.55f, 1f),  // Pink
            new Color(0.95f, 0.80f, 0.30f, 1f),  // Yellow
        };

        // ══════════════════════════════════════════════════════════════
        // HELPER METHODS
        // ══════════════════════════════════════════════════════════════

        public static Color GetBlockColor(int index)
        {
            return BlockColors[index % BlockColors.Length];
        }

        public static Color GetRandomBlockColor()
        {
            return BlockColors[Random.Range(0, BlockColors.Length)];
        }

        public static Color WithAlpha(Color color, float alpha)
        {
            return new Color(color.r, color.g, color.b, alpha);
        }

        public static Color Lerp(Color a, Color b, float t)
        {
            return Color.Lerp(a, b, t);
        }

        /// <summary>
        /// Get glass color with specified opacity (0.8 - 0.9 range)
        /// </summary>
        public static Color GetGlassColor(float opacity = 0.85f)
        {
            opacity = Mathf.Clamp(opacity, 0.8f, 0.9f);
            return WithAlpha(GlassBase, opacity);
        }
    }
}
