# Web-Based Astronaut Space Experience

A first-person 3D space exploration experience built with **Three.js** - run directly in your browser!

## Quick Start

1. **Open in Browser**
   - Double-click `index.html` OR
   - Right-click → "Open with" → Your favorite browser

2. **That's it!** The experience loads immediately with placeholder photos.

## Controls

| Key | Action |
|-----|--------|
| **WASD** | Move through space |
| **SPACE** | Move up |
| **CTRL** | Move down |
| **SHIFT** | Sprint (faster movement) |
| **Mouse** | Look around (move your mouse) |
| **Click Photo** | Pull it closer to see clearly |
| **ESC** | Toggle cursor lock |

## Features

✅ **First-person astronaut perspective**  
✅ **Smooth movement with acceleration**  
✅ **15 floating photos** (customizable)  
✅ **Click-to-zoom interaction** - pull photos closer  
✅ **Deep space nebula background** with particles  
✅ **Starfield** with 1000+ stars  
✅ **Music support** - add your own audio  
✅ **Volume control slider** - adjust music volume  
✅ **Crosshair** for precision aiming  

## File Structure

```
AstronautExperience/
├── index.html           # Main HTML file
├── js/
│   └── main.js         # All Three.js logic
├── audio/
│   └── music.mp3       # Add your music here
└── photos/             # Where to place your photos
    ├── photo1.jpg
    ├── photo2.jpg
    └── ...
```

## Adding Your Content

### Add Photos
1. Create a `photos/` folder in the project directory
2. Place your photo files (JPG/PNG) in that folder
3. In `js/main.js`, find the `loadPhotos()` function
4. Modify to load your photos instead of placeholders

**Simple Photo Loading Example:**
```javascript
const photoFiles = [
    'photos/photo1.jpg',
    'photos/photo2.jpg',
    // ... add all 15+ photos
];

photoFiles.forEach((file, i) => {
    const loader = new THREE.TextureLoader();
    loader.load(file, (texture) => {
        photoSpawner.spawnPhoto(texture, i);
    });
});
```

### Add Music
1. Create an `audio/` folder
2. Place your music file as `audio/music.mp3`
3. The music will auto-play (make sure browser allows autoplay)
4. Use the volume slider to adjust

## Customization

### Change Number of Photos
In `loadPhotos()`, change:
```javascript
const photoCount = 15;  // Change to your desired number
```

### Adjust Movement Speed
In `AstronautController` constructor:
```javascript
this.moveSpeed = 0.15;      // Normal speed
this.sprintSpeed = 0.3;     // Sprint speed (2x)
```

### Change Spawn Radius
In `PhotoSpawner` constructor:
```javascript
this.spawnRadius = 60;  // Distance from center where photos spawn
```

### Adjust Space Colors
In `createNebula()`, modify the `colors` array:
```javascript
const colors = [0x4400ff, 0xff0066, 0x00ffff, 0xaa00ff, 0xff3366];
// Replace hex colors with your choice
```

## Browser Compatibility

Works on:
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Most modern browsers

## Performance Tips

- **Fewer photos = faster** - Start with 5, test, then increase
- **Optimize image sizes** - Compress photos to ~500KB each
- **Update browser** - Use latest version for best performance
- **GPU acceleration** - Most browsers will auto-enable

## Troubleshooting

**Music doesn't play?**
- Ensure file is at `audio/music.mp3`
- Some browsers block autoplay - click anywhere if needed

**Photos don't load?**
- Check browser console (F12) for errors
- Ensure image paths are correct
- Try JPG format if PNG doesn't work

**Performance is slow?**
- Reduce number of photos
- Close other browser tabs
- Lower image quality
- Disable hardware acceleration if GPU is old

## Advanced Customization

All logic is in `js/main.js`. Key classes:
- **AstronautController** - Movement & controls
- **PhotoSpawner** - Creates floating photos
- **InputHandler** - Click detection & mouse look

## Next Steps

1. ✅ Test the basic experience (index.html)
2. 📸 Add your real photos to `photos/` folder
3. 🎵 Add your music to `audio/music.mp3`
4. 🎨 Customize colors and effects as desired
5. 🚀 Share the link with your girlfriend!

## Browser Window

For the best experience:
- **Fullscreen** - Press F11 in browser
- **High resolution** - 1920x1080 or higher recommended
- **No distractions** - Close other windows

---

Enjoy creating this special experience! 💫
