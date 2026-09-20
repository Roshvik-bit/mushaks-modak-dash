# 🪔 Mushak’s Modak Dash 🥟
**A Festive HTML5 Arcade Web Game for the Ganesh Chaturthi Game Design Contest**

[![Status: Ready to Play](https://img.shields.io/badge/Status-Ready%20to%20Play-success.svg)]()
[![Platform: Web / Mobile](https://img.shields.io/badge/Platform-Web%20%7C%20Mobile%20%7C%20Desktop-orange.svg)]()
[![Engine: HTML5 Canvas + Web Audio API](https://img.shields.io/badge/Engine-Vanilla%20JS%20%2B%20Canvas-gold.svg)]()
[![Dependencies: Zero](https://img.shields.io/badge/Dependencies-Zero-blue.svg)]()

> *"Ganpati Bappa Morya! Help Mushak, Lord Ganesha's devoted companion, catch sacred modaks and dodge mischievous obstacles to offer the grandest feast!"*

---

## 🌟 Game Highlights

- **Vibrant Ganesh Chaturthi Theme**: Deep twilight temple night sky, glowing diyas with dancing flames, fluttering saffron temple flags (dhwaja), traditional mango leaf & marigold flower toran, and celestial floating lotus petals.
- **Adorable Procedural Character ("Mushak")**: Faithfully rendered using HTML5 Canvas vector graphics—complete with a royal red/gold pagdi (turban), sacred red tilak, expressive whiskers, blinking eyes, swishing animated tail, and a golden offering thali (plate) held by his paws!
- **Rich Collectibles & Power-Ups**:
  - **Steamed Modak (Ukadiche Modak)**: Classic ivory-white fluted modak with saffron strand (+10 Pts).
  - **Fried Golden Modak (Talniche Modak)**: Crispy honey-gold modak with sparkles (+25 Pts).
  - **Divine Maha-Modak**: Celestial modak with sacred tilak (+50 Pts, restores 1 lost Diya/Life, and activates a **5-Second Modak Magnet**!).
- **Obstacles to Dodge**:
  - **Tumbling Coconuts**: Textured coir husks tumbling from the sky, splitting with a splash upon impact.
  - **Mischievous Crows**: Wing-flapping aerial obstacles swooping diagonally across the courtyard.
- **100% Procedural Web Audio API Sound Engine**:
  - Harmonic marimba/bell catch chimes that dynamically scale in pitch with your combo streak.
  - Sparkly arpeggio fanfare for Golden Modaks and resonant temple ghanta (bell) gong for Maha-Modaks.
  - Hollow thud for coconut bonks, life lost alerts, and meditative Indian raga descending motifs on game over.
  - Soothing ambient temple tanpura drone and intermittent wind chimes with a one-touch mute toggle.
- **Zero External Dependencies / Zero Broken Assets**: Everything is drawn programmatically on HTML5 Canvas and synthesized via the Web Audio API. 100% offline-ready with instant load times.

---

## 🎮 How to Play & Controls

### 💻 Desktop / Laptop:
- **Left / Right Movement**: Arrow Keys (`←` / `→`) or `A` / `D` keys.
- **Mouse Control**: Simply move your mouse cursor across the game screen to steer Mushak.
- **Pause / Resume**: Press `Spacebar` or `P` (or click the ⏸️ HUD button).
- **Sound Toggle**: Click the 🔊 / 🔇 button in the top right.

### 📱 Mobile / Touchscreens:
- **Smooth Drag**: Slide your finger anywhere horizontally along the bottom of the screen to guide Mushak directly under falling modaks.

---

## 🏆 Scoring & Rules

1. **Combos**: Catch consecutive modaks without missing any to build a combo multiplier up to **5x**!
2. **3-Life System (Diyas)**:
   - You start with **3 glowing Diyas**.
   - Missing 3 modaks extinguishes 1 Diya (tracked on the center HUD gauge).
   - Colliding with a tumbling coconut or crow loses 1 Diya immediately (with screen shake and temporary invulnerability).
   - Catching a **Divine Maha-Modak** restores 1 lost Diya!
3. **Local High Score**: Your highest score is automatically saved in your browser (`localStorage`).

---

## 🚀 How to Run Locally

Because the game has **zero external dependencies** and uses clean vanilla web standards, you can run it immediately using any method:

### Option 1: Direct File Opening
Simply double-click `index.html` or drag and drop it into Google Chrome, Safari, Firefox, or Edge.

### Option 2: Local Python Server (Recommended for audio autoplay permissions)
In your terminal, navigate to the folder and run:
```bash
python3 -m http.server 8088
```
Then open: [http://localhost:8088](http://localhost:8088) in your web browser.

### Option 3: VS Code / IDE Live Server
Right-click `index.html` and select **"Open with Live Server"**.

---

## 📁 Project Structure

```
.
├── index.html        # Main markup, responsive game shell, HUD, and modal cards
├── style.css         # Festive color tokens, glassmorphism, responsive 9:16 layout
├── audio.js          # Procedural Web Audio API sound synthesizer & ambient engine
├── game.js           # Core 60 FPS canvas loop, procedural Mushak rendering, physics & scoring
└── README.md         # Documentation and contest submission details
```

---

## 🌺 Contest Credits

- **Game Title**: Mushak's Modak Dash
- **Occasion**: Ganesh Chaturthi Game Design Contest
- **Salutation**: *Ganpati Bappa Morya, Mangal Murti Morya!* 🙏
