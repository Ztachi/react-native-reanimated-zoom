# @ztachi007/react-native-reanimated-zoom

A high-performance, physics-based zoomable image component for React Native, powered by **Reanimated v3** and **Gesture Handler v2**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-ios%20%7C%20android-lightgrey.svg)

## Features

| Feature | Description |
| :--- | :--- |
| **Pinch to Zoom** | Smooth 60fps zooming with rubber-band effect when exceeding min/max limits. |
| **Momentum Pan** | Physics-based decay animation after panning (tossing the image). |
| **Rubber Banding** | Resistance when dragging outside image boundaries, with spring-back animation. |
| **Double Tap** | Double tap to zoom in on specific focal point; double tap again to reset. |
| **Auto Sizing** | Automatically detects image dimensions using `Image.getSize` if not provided. |
| **Clean State** | Resets completely on unmount or URI change, preventing state pollution. |

## Installation

### 1. Install the package

```bash
npm install @ztachi007/react-native-reanimated-zoom
# or
yarn add @ztachi007/react-native-reanimated-zoom
# or
pnpm add @ztachi007/react-native-reanimated-zoom
```

### 2. Install Peer Dependencies

This library depends on `react-native-reanimated` and `react-native-gesture-handler`. If you are using Expo, they are likely already installed.

```bash
npm install react-native-reanimated react-native-gesture-handler
```

> **Note:** Don't forget to wrap your app root with `<GestureHandlerRootView>` (standard Gesture Handler setup) and add the Reanimated Babel plugin if needed.

## Usage

### Basic Usage

Simply pass the image URI. The component will automatically fetch the image size and handle the aspect ratio.

```tsx
import { ZoomableImage } from '@ztachi007/react-native-reanimated-zoom';

export default function ImagePreview({ route }) {
  const { uri } = route.params;

  return (
    <ZoomableImage 
      uri={uri} 
      style={{ flex: 1 }}
    />
  );
}
```

### With Known Dimensions (Optimized)

If you already know the image dimensions (e.g., from your API), pass them to skip the `Image.getSize` step for instant rendering.

```tsx
<ZoomableImage
  uri={uri}
  imageWidth={1080}
  imageHeight={1920}
/>
```

### Advanced Configuration

Customize the physics and interaction behavior.

```tsx
<ZoomableImage
  uri={uri}
  config={{
    maxScale: 6,             // Maximum zoom level (default: 5)
    doubleTapScale: 3,       // Zoom level on double tap (default: 2.5)
    decelerationRate: 0.994, // Friction for momentum fling (default: 0.998)
    spring: {                // Spring config for rubber-band effect
      damping: 20,
      stiffness: 150,
    },
  }}
  renderLoading={() => <MyCustomSpinner />}
/>
```

## Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `uri` | `string` | **Required** | The image URI (remote URL or local file path). |
| `imageWidth` | `number` | - | Original image width. If provided with `imageHeight`, skips async size calculation. |
| `imageHeight` | `number` | - | Original image height. |
| `config` | `object` | `DEFAULT` | Configuration object for gesture behavior (see below). |
| `style` | `StyleProp<ViewStyle>` | `{ flex: 1 }` | Styles for the container view. |
| `backgroundColor` | `string` | `'#000'` | Background color of the container. |
| `renderLoading` | `() => ReactNode` | `ActivityIndicator` | Custom component to render while fetching image size. |

### Config Object

```ts
interface ZoomableImageConfig {
  maxScale?: number;          // Default: 5
  doubleTapScale?: number;    // Default: 2.5
  decelerationRate?: number;  // Default: 0.998 (0-1)
  spring?: {                  // Reanimated spring config
    damping?: number;         // Default: 18
    stiffness?: number;       // Default: 230
    mass?: number;            // Default: 0.3
  };
}
```

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
