# @repo/image-preview

> React Native 通用可缩放图片预览组件。  
> Powered by **react-native-reanimated** + **react-native-gesture-handler**，具备原生级别的弹性手感。

---

## 特性

| 功能 | 说明 |
|------|------|
| 捏合缩放 | 超过边界时橡皮筋阻力，松手弹回，可体验"捏扁"效果 |
| 平移 + 惯性 | 手指释放后物理衰减滑动（`withDecay`），衰减系数可配置 |
| 橡皮筋过界 | 拖拽超出图片边界时阻力渐增，释放自动弹回 |
| 双击焦点缩放 | 以点击位置为焦点放大，再次双击复位 |
| 自动尺寸检测 | 未传 `imageWidth/imageHeight` 时自动调用 `Image.getSize` |
| 状态全新初始化 | 内部用 `key={uri}` 保证每次挂载从零开始，无 native 状态残留 |

---

## 安装

> 本包为 monorepo 内部私有包，通过 `workspace:*` 引用。

在消费方 app 的 `package.json` 中添加：

```jsonc
{
  "dependencies": {
    "@repo/image-preview": "workspace:*"
  }
}
```

然后执行：

```bash
pnpm install
```

### Peer Dependencies

确保消费方 app 已安装以下原生依赖（Expo 项目通常已内置）：

| 包 | 最低版本 |
|---|---|
| `react-native-gesture-handler` | `>=2.0.0` |
| `react-native-reanimated` | `>=3.0.0` |

---

## 快速上手

### 最简用法（仅传 URI）

```tsx
import { ZoomableImage } from "@repo/image-preview";

export function PhotoPreviewScreen({ uri }: { uri: string }) {
  return <ZoomableImage uri={uri} />;
}
```

组件会自动通过 `Image.getSize` 获取图片尺寸并展示 ActivityIndicator 占位。

---

### 提前传入尺寸（跳过自动检测，渲染更快）

```tsx
<ZoomableImage
  uri={uri}
  imageWidth={1080}
  imageHeight={3600}
/>
```

---

### 完整配置示例

```tsx
import { ZoomableImage } from "@repo/image-preview";

<ZoomableImage
  uri={uri}
  imageWidth={previewSize?.width}
  imageHeight={previewSize?.height}
  config={{
    maxScale: 6,           // 最大放大倍数，默认 5
    doubleTapScale: 3,     // 双击放大倍数，默认 2.5
    decelerationRate: 0.997, // 惯性衰减系数，默认 0.998
    spring: {
      damping: 15,         // 阻尼，默认 18（越低弹性越强）
      stiffness: 200,      // 刚度，默认 230
      mass: 0.4,           // 质量，默认 0.3
    },
  }}
  backgroundColor="#111"
  style={{ flex: 1 }}
  renderLoading={() => <MyCustomLoadingSpinner />}
/>
```

---

## 在 Modal 中使用（典型场景）

```tsx
import { Modal, TouchableOpacity, View } from "react-native";
import { ZoomableImage } from "@repo/image-preview";

function ImagePreviewModal({
  visible,
  uri,
  imageWidth,
  imageHeight,
  onClose,
}: {
  visible: boolean;
  uri: string | null;
  imageWidth?: number;
  imageHeight?: number;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {uri && (
          <ZoomableImage
            uri={uri}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
          />
        )}
        {/* 关闭按钮（浮层） */}
        <TouchableOpacity
          onPress={onClose}
          style={{ position: "absolute", top: 50, right: 16 }}
        >
          {/* 你的关闭图标 */}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
```

> ⚠️ **关闭 Modal 时请同步将 `uri` 重置为 `null`**，确保下次打开时 `ZoomableImage` 从全新状态挂载。

---

## API

### `<ZoomableImage />`

| Prop | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `uri` | `string` | ✅ | — | 图片 URI（`file://`、`http(s)://`、`data:` 等均支持） |
| `imageWidth` | `number` | ❌ | — | 图片原始宽度（px）。与 `imageHeight` 同传时跳过自动检测 |
| `imageHeight` | `number` | ❌ | — | 图片原始高度（px） |
| `config` | `ZoomableImageConfig` | ❌ | 见下表 | 手势与动画配置 |
| `style` | `StyleProp<ViewStyle>` | ❌ | — | 外层容器样式（默认 `flex: 1`） |
| `backgroundColor` | `string` | ❌ | `'#000'` | 背景颜色 |
| `renderLoading` | `() => ReactNode` | ❌ | `<ActivityIndicator>` | 尺寸检测期间的自定义占位 |

---

### `ZoomableImageConfig`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxScale` | `number` | `5` | 最大缩放倍数（超出后橡皮筋限制） |
| `doubleTapScale` | `number` | `2.5` | 双击放大的目标倍数 |
| `decelerationRate` | `number` | `0.998` | 惯性衰减系数（`0.998` ≈ iOS ScrollView 默认值） |
| `spring.damping` | `number` | `18` | Spring 阻尼（越低弹性越强） |
| `spring.stiffness` | `number` | `230` | Spring 刚度（越高响应越快） |
| `spring.mass` | `number` | `0.3` | Spring 质量（越低动作越轻盈） |

---

### 导出列表

```ts
import {
  ZoomableImage,       // 组件
  type ZoomableImageProps,
  type ZoomableImageConfig,
  type SpringConfig,
  DEFAULT_CONFIG,      // 默认配置常量
} from "@repo/image-preview";
```

---

## 目录结构

```
packages/image-preview/
├── src/
│   ├── index.ts            # 公共导出入口
│   ├── types.ts            # TypeScript 接口 & 默认配置
│   └── ZoomableImage.tsx   # 组件实现（内外双组件架构）
├── package.json
├── tsconfig.json
├── CHANGELOG.md
└── README.md
```

---

## 实现说明

### 双组件架构

```
ZoomableImage (外层)
  ├── 处理 Image.getSize 异步尺寸检测
  ├── 展示 loading 占位
  └── ZoomableImageContent (内层，key={uri})
        ├── 所有 useSharedValue 从确定初始值创建
        ├── 捏合 / 平移 / 双击手势逻辑
        └── Reanimated Animated.Image
```

外层组件负责数据准备（异步尺寸），内层组件只在数据就绪后挂载，确保每次 `uri` 变化时内层完全卸载重建，彻底消除 native 状态残留导致的二次打开位置偏移问题。

### 手势优先级

```
Race(
  doubleTap,                          ← 双击识别优先
  Simultaneous(pan, pinch)            ← 平移 + 捏合并行
)
```

- **`Race`**：双击先识别 → 取消平移/捏合；手指移动 → 取消双击
- **`Simultaneous`**：pan（平移/质心移动）与 pinch（scale）并行，互不干扰

### 橡皮筋公式

```
over-boundary translate: bound + excess × 0.38
over-boundary scale:      minScale + excess × 0.40  (缩小)
                          maxScale + excess × 0.28  (放大)
```

---

## 版本历史

见 [CHANGELOG.md](./CHANGELOG.md)。
