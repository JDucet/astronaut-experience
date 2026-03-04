# Astronaut Space Experience - Setup Guide

## Overview
This is a first-person space exploration experience where you can float around and interact with floating photos of you and your girlfriend in a beautiful deep space environment.

## Controls
- **WASD** - Move around in space
- **Mouse** - Look around
- **Left Shift** - Sprint (move faster)
- **Mouse Click** - Click on floating photos to pull them closer for a better view
- **ESC** - Unlock/lock cursor

## Installation Steps

### 1. Open in Unity
- Open **Unity Hub**
- Click "Add project from disk"
- Navigate to: `C:\Users\User\Desktop\Regalo Andrea\AstronautExperience`
- Select the folder and open it
- Unity will automatically create the project structure

### 2. Project Setup in Unity Editor

#### Scene Setup:
1. Create a new Scene: `Scenes > New Scene` and save it as "MainScene"
2. Add GameObjects in this order:

**Astronaut Player (Main Camera):**
- Right-click in Hierarchy > 3D Object > Capsule
- Rename to "Player"
- Position: (0, 0, 0)
- Add Component: `AstronautController` script
- Add Component: Rigidbody
  - Set Mass: 1
  - Uncheck "Use Gravity"
  - Freeze Rotation: X, Y, Z
- Create a child object (3D Object > Camera)
  - Remove the second Camera component from child
  - Position child camera at (0, 0.6, 0) relative to Player

**Environment:**
- Right-click > Create Empty
- Rename to "Environment"
- Add Component: `SpaceEnvironment` script
- Add Component: Light (Directional)
  - Set Color to soft blue/purple

**Photo System:**
- Right-click > Create Empty
- Rename to "PhotoSpawner"
- Add Component: `PhotoSpawner` script
- Create a new Prefab for photos:
  - Right-click > 3D Object > Quad
  - Rename to "PhotoPrefab"
  - Scale: (4, 3, 1) to match photo aspect ratio
  - Add Component: `FloatingPhoto` script
  - Add Component: BoxCollider
  - Add Component: Outline (from Codebase/Effects if available)
  - Drag into Assets/Prefabs folder as prefab
  - Assign this prefab to PhotoSpawner's "photoPrefab" field

**Raycast Handler:**
- Right-click > Create Empty
- Rename to "InputManager"
- Add Component: `PhotoRaycast` script

**Music:**
- Right-click > Create Empty
- Rename to "MusicManager"
- Add Component: AudioSource
- Add Component: `MusicManager` script

### 3. Adding Your Photos
- Place your photo files in: `Assets/Textures/`
- In the "PhotoPrefab":
  - Select the Quad
  - Create a Material for the photo
  - Assign the material to the Quad
  - Use shader: Unlit/Texture

### 4. Adding Music
- Place your audio file in: `Assets/Audio/`
- Name it `music.mp3` or `music.wav`
- The MusicManager will automatically detect and play it

### 5. Skybox (Optional)
For a better deep space look:
- In Project window, create a new Skybox material
- Use a space/nebula texture pack
- Assign to RenderSettings

## Features

### Floating Photos
- Photos automatically spawn at random positions around you
- Each photo gently floats and rotates
- **Click** on any photo to pull it closer
- Pull photos up to 2 meters away for a clear view
- Click again to release

### Movement
- Smooth acceleration/deceleration in space
- Sprint with Shift key
- Full 360-degree movement

### Atmosphere
- Deep space nebula background with purple/red colors
- Particle system for nebula effect
- Ambient lighting for a cosmic feel

## Customization

### Adjust Photo Count:
- In PhotoSpawner component: Change "Photo Count" to desired number (default: 15)

### Change Spawn Distance:
- Modify "Spawn Radius" in PhotoSpawner (default: 50 units)

### Adjust Movement Speed:
- In AstronautController: Change "Move Speed" (default: 5)
- Change "Sprint Speed" (default: 10)

### Adjust Look Sensitivity:
- In AstronautController: Change "Look Sensitivity" (default: 2)

### Change Nebula Colors:
- In SpaceEnvironment: Modify "Nebula Color1" and "Nebula Color2"

## Tips for the Best Experience
1. Use a full HD monitor or higher for crisp photo visibility
2. Test with a few photos first, then scale up to 15
3. Add ambient sound (breathing, subtle space sounds) along with music
4. Consider adding subtle lighting effects around each photo
5. Test on different hardware to ensure smooth performance

## Next Steps
- Replace placeholder photos with your actual photos
- Upload your music file
- Test the experience with the lighting setup
- Adjust colors and effects to match your vision

Enjoy creating this special experience! 🚀
