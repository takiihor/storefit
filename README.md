# StoreFit

A browser-based image converter for preparing App Store Connect screenshots and creative assets. Images are processed locally, without a backend or third-party dependencies.

Traditional Chinese is the default interface. Use the **Language / 語言** selector in the header to switch to English. Switching languages opens a separate page, so export your work before switching; loaded images are not carried over. Conversion settings are shared between languages on the same origin.

## Run locally

Open `index.html` in a modern browser, or serve the folder locally:

```sh
python3 -m http.server 8000
```

Visit <http://localhost:8000>. The English version is at <http://localhost:8000/en/>. No installation or build step is required.

## Usage

1. Drop, choose, or paste PNG, JPEG, or WebP images.
2. Select one or more output targets and an orientation where available.
3. Choose a blurred background, solid padding, or crop-to-fill layout. Adjust the background, crop anchor, format, and JPEG quality.
4. Review the preview, then export a ZIP with organized folders, numbered images, and an export manifest.

## Features

- Built-in presets for product page headers, search assets, iPhone, iPad, Mac, Apple TV, Apple Vision Pro, Apple Watch, and in-app events.
- Custom dimensions from 100 to 20,000 pixels per side, subject to a 100-million-pixel limit.
- Up to 24 source images; screenshot targets enforce a 10-image limit.
- Exact output dimensions, flattened backgrounds, JPEG export, and RGB PNG encoding where supported.
- Local conversion settings saved in browser local storage.

Use a current Safari or Chromium-based browser for RGB PNG encoding. The standard PNG fallback may retain an alpha channel. Large images can consume substantial browser memory.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Traditional Chinese interface |
| `app.js` | Traditional Chinese conversion logic and messages |
| `en/index.html` | English interface |
| `en/app.js` | English conversion logic and messages |
| `styles.css` | Shared responsive styles |

Keep the two language versions in sync when changing conversion behavior.

## Asset requirements

Presets are built into the application and may change over time. Check Apple's current requirements before uploading:

- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Creative asset specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications/)
- [Asset best practices](https://developer.apple.com/app-store/asset-best-practices/)

StoreFit is an independent tool and is not affiliated with Apple.
