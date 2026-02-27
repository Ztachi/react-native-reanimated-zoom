import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from "react-native-reanimated";
import {
  DECAY_RUBBER_BAND_FACTOR,
  DEFAULT_CONFIG,
  RUBBER_BAND_FACTOR,
  type ZoomableImageConfig,
  type ZoomableImageProps,
} from "./types";

const LOG = "[ZoomableImage]";

// ── 内部工具类型 ───────────────────────────────────────────────────────────────

interface ImageSize {
  width: number;
  height: number;
}

interface CoreProps {
  uri: string;
  imgSize: ImageSize;
  containerWidth: number;
  containerHeight: number;
  cfg: Required<ZoomableImageConfig> & {
    spring: { damping: number; stiffness: number; mass: number };
  };
}

// ── 核心手势组件（仅在尺寸就绪后渲染，hooks 无条件调用） ─────────────────────

/**
 * @description: 内部核心渲染组件。尺寸确定后才挂载，保证所有 Reanimated hook
 * 均从确定的初始值开始，杜绝二次打开时位置偏移的问题。
 * @param {CoreProps} props
 */
function ZoomableImageContent({
  uri,
  imgSize,
  containerWidth,
  containerHeight,
  cfg,
}: CoreProps) {
  const { maxScale, doubleTapScale, spring: springCfg, decelerationRate } = cfg;

  const imageRatio = imgSize.width / imgSize.height;
  /** 适配容器宽度，高度等比缩放（长图纵向可滚动） */
  const displayWidth = containerWidth;
  const displayHeight = containerWidth / imageRatio;

  /**
   * 初始 Y 偏移：flex justifyContent:center 将图片中心对准容器中心。
   * 当 displayHeight > containerHeight 时需向下偏移，使图片顶部对齐容器顶部。
   * initTranslateY = (displayHeight - containerHeight) / 2
   */
  const initTranslateY =
    displayHeight > containerHeight
      ? (displayHeight - containerHeight) / 2
      : 0;

  // ── 共享值（每次挂载均从初始值创建） ──────────────────────────────────────
  const scale = useSharedValue(1);
  /** 捏合手势开始时保存的 scale 基准 */
  const pinchSavedScale = useSharedValue(1);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(initTranslateY);
  /** 平移手势开始时保存的平移基准（cancelAnimation 后捕获当前动画帧位置） */
  const panSavedTX = useSharedValue(0);
  const panSavedTY = useSharedValue(initTranslateY);

  // ── 工具函数（worklet 上下文） ─────────────────────────────────────────────

  /**
   * @description: 计算当前 scale 下可平移的最大绝对值。
   * @param {number} s 当前 scale
   * @return {{ maxX: number; maxY: number }}
   */
  const getMaxTranslate = (s: number): { maxX: number; maxY: number } => {
    "worklet";
    return {
      maxX: Math.max(0, (displayWidth * s - containerWidth) / 2),
      maxY: Math.max(0, (displayHeight * s - containerHeight) / 2),
    };
  };

  /**
   * @description: 对超出 [lo, hi] 的值施加线性橡皮筋阻力。
   * @param {number} v 原始值
   * @param {number} lo 下界
   * @param {number} hi 上界
   * @return {number} 施加阻力后的值
   */
  const rubberBand = (v: number, lo: number, hi: number): number => {
    "worklet";
    if (v >= lo && v <= hi) return v;
    const excess = v < lo ? v - lo : v - hi;
    return (v < lo ? lo : hi) + excess * RUBBER_BAND_FACTOR;
  };

  /**
   * @description: 对超界 scale 施加橡皮筋阻力。
   * scale < MIN_SCALE 时以 40% 阻力继续响应（捏合缩小感）；
   * scale > maxScale 时以 28% 阻力限制（捏合放大感）。
   * @param {number} raw 原始 scale
   * @return {number} 施加阻力后的 scale
   */
  const rubberBandScale = (raw: number): number => {
    "worklet";
    if (raw >= 1 && raw <= maxScale) return raw;
    if (raw < 1) return 1 + (raw - 1) * 0.4;
    return maxScale + (raw - maxScale) * 0.28;
  };

  // ── 捏合缩放手势 ────────────────────────────────────────────────────────────
  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      cancelAnimation(scale);
      pinchSavedScale.value = scale.value;
    })
    .onUpdate((e) => {
      // 只处理 scale；平移由同时运行的 pan 手势负责
      scale.value = rubberBandScale(pinchSavedScale.value * e.scale);
    })
    .onEnd(() => {
      // 将 scale 弹回合法范围
      const target = Math.max(1, Math.min(maxScale, scale.value));
      scale.value = withSpring(target, springCfg);
      pinchSavedScale.value = target;

      // scale 变化后平移边界也随之变化，将平移值收紧到新边界
      const { maxX, maxY } = getMaxTranslate(target);
      const clampedX = Math.max(-maxX, Math.min(maxX, translateX.value));
      const clampedY = Math.max(-maxY, Math.min(maxY, translateY.value));
      translateX.value = withSpring(clampedX, springCfg);
      translateY.value = withSpring(clampedY, springCfg);
      // 更新 pan 的基准，防止下次平移从脏值出发
      panSavedTX.value = clampedX;
      panSavedTY.value = clampedY;
    });

  // ── 平移手势（橡皮筋 + 惯性滑动） ─────────────────────────────────────────
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // 打断任何正在运行的 decay/spring，锁定当前帧位置作为新手势基准
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      panSavedTX.value = translateX.value;
      panSavedTY.value = translateY.value;
    })
    .onUpdate((e) => {
      const { maxX, maxY } = getMaxTranslate(scale.value);
      // 超界时施加橡皮筋阻力
      translateX.value = rubberBand(panSavedTX.value + e.translationX, -maxX, maxX);
      translateY.value = rubberBand(panSavedTY.value + e.translationY, -maxY, maxY);
    })
    .onEnd((e) => {
      const { maxX, maxY } = getMaxTranslate(scale.value);
      /**
       * withDecay: 带物理惯性衰减的滑动。
       * rubberBandFactor > 0：到达 clamp 边界时弹性反弹而非硬停；
       * 若当前值已超界（橡皮筋拉出），decay 会将其自然弹回边界内。
       */
      translateX.value = withDecay({
        velocity: e.velocityX,
        clamp: [-maxX, maxX],
        rubberBandFactor: DECAY_RUBBER_BAND_FACTOR,
        deceleration: decelerationRate,
      });
      translateY.value = withDecay({
        velocity: e.velocityY,
        clamp: [-maxY, maxY],
        rubberBandFactor: DECAY_RUBBER_BAND_FACTOR,
        deceleration: decelerationRate,
      });
      panSavedTX.value = translateX.value;
      panSavedTY.value = translateY.value;
    });

  // ── 双击缩放（焦点对准点击位置） ──────────────────────────────────────────
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(10)
    .onEnd((e) => {
      if (scale.value > 1.1) {
        // 已缩放：复位到初始状态（长图回到顶部）
        scale.value = withSpring(1, springCfg);
        pinchSavedScale.value = 1;
        translateX.value = withSpring(0, springCfg);
        translateY.value = withSpring(initTranslateY, springCfg);
        panSavedTX.value = 0;
        panSavedTY.value = initTranslateY;
      } else {
        // 以点击位置为焦点放大到 doubleTapScale
        /**
         * 焦点保持公式：
         * newTX = fRelX + (currentTX - fRelX) * (targetScale / currentScale)
         * 确保屏幕上 fRel 所指向的图片像素在缩放后仍在相同屏幕位置。
         */
        const fRelX = e.absoluteX - containerWidth / 2;
        const fRelY = e.absoluteY - containerHeight / 2;
        const ratio = doubleTapScale / scale.value;
        const newTX = fRelX + (translateX.value - fRelX) * ratio;
        const newTY = fRelY + (translateY.value - fRelY) * ratio;

        const { maxX, maxY } = getMaxTranslate(doubleTapScale);
        const clampedX = Math.max(-maxX, Math.min(maxX, newTX));
        const clampedY = Math.max(-maxY, Math.min(maxY, newTY));

        scale.value = withSpring(doubleTapScale, springCfg);
        pinchSavedScale.value = doubleTapScale;
        translateX.value = withSpring(clampedX, springCfg);
        translateY.value = withSpring(clampedY, springCfg);
        panSavedTX.value = clampedX;
        panSavedTY.value = clampedY;
      }
    });

  /**
   * 手势组合：
   * - Race(doubleTap, Simultaneous(pan, pinch))
   *   双击先识别则取消平移/捏合；手指移动则取消双击识别。
   * - Simultaneous(pan, pinch)：平移与捏合并行。
   *   pan 负责平移（含二指质心移动）；pinch 负责 scale。
   */
  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(panGesture, pinchGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      {/* overflow:hidden 防止缩放时图片溢出容器 */}
      <View style={styles.gestureContainer}>
        <Animated.Image
          source={{ uri }}
          style={[{ width: displayWidth, height: displayHeight }, animatedStyle]}
          resizeMode="contain"
        />
      </View>
    </GestureDetector>
  );
}

// ── 公共入口组件（处理尺寸检测 + loading） ────────────────────────────────────

/**
 * @description: 可缩放图片预览公共组件。
 *
 * 支持特性：
 * - 捏合缩放（含超界橡皮筋 + 弹回，可缩小到 1x 以下体验弹性）
 * - 平移 + 惯性滑动（withDecay，衰减系数可配置）
 * - 超界平移橡皮筋阻力
 * - 双击精准焦点缩放 / 复位
 * - 自动检测图片尺寸（可通过 imageWidth/imageHeight 跳过）
 * - 每次挂载状态全新，无 native 状态残留
 *
 * @example
 * // 最简用法
 * <ZoomableImage uri="file://path/to/photo.jpg" />
 *
 * @example
 * // 完整配置
 * <ZoomableImage
 *   uri={uri}
 *   imageWidth={1080}
 *   imageHeight={3000}
 *   config={{ maxScale: 6, doubleTapScale: 3 }}
 *   backgroundColor="#111"
 * />
 *
 * @param {ZoomableImageProps} props
 * @return {React.ReactElement}
 */
export function ZoomableImage({
  uri,
  imageWidth,
  imageHeight,
  config,
  style,
  backgroundColor = "#000",
  renderLoading,
}: ZoomableImageProps): React.ReactElement {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // ── 合并配置与默认值 ──────────────────────────────────────────────────────
  const cfg = useMemo(
    () => ({
      maxScale: config?.maxScale ?? DEFAULT_CONFIG.maxScale,
      doubleTapScale: config?.doubleTapScale ?? DEFAULT_CONFIG.doubleTapScale,
      spring: {
        damping: config?.spring?.damping ?? DEFAULT_CONFIG.spring.damping,
        stiffness: config?.spring?.stiffness ?? DEFAULT_CONFIG.spring.stiffness,
        mass: config?.spring?.mass ?? DEFAULT_CONFIG.spring.mass,
      },
      decelerationRate:
        config?.decelerationRate ?? DEFAULT_CONFIG.decelerationRate,
    }),
    [config]
  );

  // ── 图片尺寸检测 ─────────────────────────────────────────────────────────
  const [imgSize, setImgSize] = useState<ImageSize | null>(
    // 调用方已提供尺寸时直接使用，跳过异步检测
    imageWidth && imageHeight ? { width: imageWidth, height: imageHeight } : null
  );

  useEffect(() => {
    // 调用方已提供尺寸，无需异步检测
    if (imageWidth && imageHeight) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImgSize((prev) => {
        if (prev && prev.width === imageWidth && prev.height === imageHeight) {
          return prev;
        }
        return { width: imageWidth, height: imageHeight };
      });
      return;
    }
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.log(LOG, "getSize success:", w, "x", h);
          setImgSize({ width: w, height: h });
        }
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn(LOG, "getSize failed:", err);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [uri, imageWidth, imageHeight]);

  // ── 容器尺寸（使用屏幕尺寸，适合全屏 Modal 场景） ─────────────────────────
  const containerWidth = screenWidth;
  const containerHeight = screenHeight;

  // ── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {imgSize ? (
        /**
         * key={uri} 保证每次 URI 变化时 ZoomableImageContent 完全卸载重挂，
         * 所有 useSharedValue 均从初始值重新创建，彻底消除状态残留。
         */
        <ZoomableImageContent
          key={uri}
          uri={uri}
          imgSize={imgSize}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          cfg={cfg}
        />
      ) : renderLoading ? (
        renderLoading()
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4163FF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gestureContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
