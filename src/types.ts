import type { StyleProp, ViewStyle } from "react-native";

// ── Spring 配置 ────────────────────────────────────────────────────────────────

/**
 * Reanimated withSpring 弹性参数。
 * damping 越低弹性越强；stiffness 越高响应越快；mass 越低动作越轻盈。
 */
export interface SpringConfig {
  /** 阻尼系数（default: 18） */
  damping?: number;
  /** 刚度（default: 230） */
  stiffness?: number;
  /** 质量（default: 0.3） */
  mass?: number;
}

// ── 手势 & 动画配置 ───────────────────────────────────────────────────────────

/**
 * ZoomableImage 手势与动画配置项。所有字段均可选，未填时使用默认值。
 */
export interface ZoomableImageConfig {
  /**
   * 最大缩放倍数。
   * @default 5
   */
  maxScale?: number;

  /**
   * 双击放大的目标倍数。
   * @default 2.5
   */
  doubleTapScale?: number;

  /**
   * Reanimated spring 弹性参数，影响捏合松手后的回弹手感。
   */
  spring?: SpringConfig;

  /**
   * 惯性滑动衰减系数，范围 0–1，越接近 1 惯性越长（类似 iOS ScrollView 默认值 0.998）。
   * @default 0.998
   */
  decelerationRate?: number;
}

// ── 组件 Props ─────────────────────────────────────────────────────────────────

/**
 * ZoomableImage 组件入参。
 */
export interface ZoomableImageProps {
  /**
   * 图片 URI，支持 file://、http(s)://、data: 等所有 React Native Image 支持的格式。
   */
  uri: string;

  /**
   * 图片原始宽度（像素）。
   * 与 imageHeight 同时传入时跳过自动检测，直接计算布局，渲染更快。
   */
  imageWidth?: number;

  /**
   * 图片原始高度（像素）。
   * 与 imageWidth 同时传入时跳过自动检测，直接计算布局，渲染更快。
   */
  imageHeight?: number;

  /**
   * 手势与动画配置，不传时使用全套默认值。
   */
  config?: ZoomableImageConfig;

  /**
   * 外层容器样式（默认 flex:1）。
   */
  style?: StyleProp<ViewStyle>;

  /**
   * 背景颜色（default: '#000'）。
   */
  backgroundColor?: string;

  /**
   * 自定义加载占位渲染函数，在图片尺寸未确定前展示。
   * 不传则展示内置 ActivityIndicator。
   */
  renderLoading?: () => React.ReactNode;
}

// ── 默认配置 ──────────────────────────────────────────────────────────────────

/** ZoomableImageConfig 完整默认值 */
export const DEFAULT_CONFIG = {
  maxScale: 5,
  doubleTapScale: 2.5,
  spring: {
    damping: 18,
    stiffness: 230,
    mass: 0.3,
  },
  decelerationRate: 0.998,
} as const satisfies Required<Omit<ZoomableImageConfig, "spring">> & {
  spring: Required<SpringConfig>;
};

/** 橡皮筋阻力系数（过界平移的传递比例，0.38 ≈ iOS UIScrollView 手感） */
export const RUBBER_BAND_FACTOR = 0.38;

/** withDecay 到达边界后的橡皮筋弹性（0–1） */
export const DECAY_RUBBER_BAND_FACTOR = 0.55;
