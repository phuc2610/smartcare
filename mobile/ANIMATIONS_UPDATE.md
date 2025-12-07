# Cập nhật Animations - SmartCare App

## Tổng quan
Đã thêm animations mềm mại và mượt mà cho toàn bộ ứng dụng, giữ nguyên màu sắc hiện tại.

## Các cải tiến đã thực hiện

### 1. Animation Utilities (`utils/animations.ts`)
- Tạo các animation configs chuẩn (spring, timing)
- Các animation functions: fadeIn, fadeOut, scaleIn, scaleOut, slide, bounce, pulse, shake
- Dễ dàng tái sử dụng trong toàn bộ app

### 2. Navigation Animations
- **Tab Navigation**: Icons có scale animation khi được chọn
- **Add Button**: Có rotation và scale animation khi active
- **Screen Transitions**: 
  - Fade animation cho Auth/Main screens
  - Slide from right cho các màn hình con
  - Duration: 300ms (mượt mà)

### 3. Component Animations

#### AnimatedButton (`components/AnimatedButton.tsx`)
- Scale animation khi press (0.95 → 1)
- Opacity animation khi press
- Bounce effect khi click
- Hỗ trợ variants: primary, secondary, outline

#### AnimatedCard (`components/AnimatedCard.tsx`)
- Fade in + slide up animation
- Staggered animation cho list items (delay theo index)
- Scale animation khi xuất hiện

#### StatCard (Updated)
- Fade in + scale animation
- Staggered delay cho multiple cards
- Smooth spring animation

#### AppHeader (Updated)
- Icon buttons có scale animation khi press
- Smooth transitions

### 4. Màu sắc
Giữ nguyên toàn bộ màu sắc hiện tại:
- Primary: #0d9488
- Secondary: #6366f1
- Success: #10b981
- Error: #ef4444
- Warning: #f59e0b
- Background: #f3f4f6

## Cách sử dụng

### Sử dụng AnimatedButton
```tsx
import { AnimatedButton } from '../components/AnimatedButton';

<AnimatedButton
  onPress={handlePress}
  title="Lưu"
  variant="primary"
/>
```

### Sử dụng AnimatedCard
```tsx
import { AnimatedCard } from '../components/AnimatedCard';

<AnimatedCard index={0} delay={0}>
  <Text>Nội dung card</Text>
</AnimatedCard>
```

### Sử dụng Animation Utilities
```tsx
import { fadeIn, scaleIn, ANIMATION_CONFIG } from '../utils/animations';

const opacity = useSharedValue(0);
opacity.value = fadeIn();
```

## Hiệu ứng đã thêm

1. **Tab Icons**: Scale 1.1x khi active
2. **Add Button**: Rotation 90deg + scale khi active
3. **Buttons**: Scale down khi press, bounce khi release
4. **Cards**: Fade in + slide up với staggered delay
5. **Screen Transitions**: Fade và slide animations
6. **Icon Buttons**: Scale + opacity khi press

## Performance
- Sử dụng `react-native-reanimated` (đã có sẵn)
- Animations chạy trên UI thread (60fps)
- Không ảnh hưởng đến performance

## Next Steps (Tùy chọn)
Có thể thêm animations cho:
- List items trong Dashboard
- Form inputs
- Modal transitions
- Loading states
- Pull to refresh

