import os
from PIL import Image

app_icon_src = r"C:\Users\ck\.gemini\antigravity-ide\brain\fab70708-682f-4eca-ab7b-b6765b8f71c2\envpilot_app_icon_1793335758133.jpg"
sidebar_src = r"C:\Users\ck\.gemini\antigravity-ide\brain\fab70708-682f-4eca-ab7b-b6765b8f71c2\nsis_installer_sidebar_1793335775268.jpg"

output_icons_dir = r"d:\code\09_my_poject\03_env-pilot\src-tauri\icons"
output_nsis_dir = r"d:\code\09_my_poject\03_env-pilot\src-tauri\nsis"
output_assets_dir = r"d:\code\09_my_poject\03_env-pilot\src\assets"

os.makedirs(output_nsis_dir, exist_ok=True)
os.makedirs(output_icons_dir, exist_ok=True)
os.makedirs(output_assets_dir, exist_ok=True)

# 1. 处理应用主图标
img_icon = Image.open(app_icon_src)
w, h = img_icon.size
print(f"原图标尺寸: {w}x{h}")

# 居中裁剪或适度微调：原图是 1024x1024，卡片居中，稍微向内收敛边距确保主体饱满
# 原图外边距留白约 6% ~ 8%，卡片大约在 [80, 80, 944, 944]
# 直接高质量下采样到 512x512
img_512 = img_icon.resize((512, 512), Image.Resampling.LANCZOS)
img_512.save(os.path.join(output_icons_dir, "icon.png"), "PNG")
img_512.save(os.path.join(output_assets_dir, "logo.png"), "PNG")

# 128x128@2x.png (即 256x256)
img_256 = img_icon.resize((256, 256), Image.Resampling.LANCZOS)
img_256.save(os.path.join(output_icons_dir, "128x128@2x.png"), "PNG")

# 128x128.png
img_128 = img_icon.resize((128, 128), Image.Resampling.LANCZOS)
img_128.save(os.path.join(output_icons_dir, "128x128.png"), "PNG")

# 32x32.png
img_32 = img_icon.resize((32, 32), Image.Resampling.LANCZOS)
img_32.save(os.path.join(output_icons_dir, "32x32.png"), "PNG")

# icon.ico: 包含多种尺寸
icon_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img_icon.save(os.path.join(output_icons_dir, "icon.ico"), format="ICO", sizes=icon_sizes)

# 2. 处理 NSIS 侧边栏图片 (164 x 314 BMP, 24-bit RGB)
img_sidebar = Image.open(sidebar_src).convert("RGB")
# 居中裁剪以匹配 164:314 比例 (约 0.52229)
sb_w, sb_h = img_sidebar.size
target_ratio = 164.0 / 314.0
curr_ratio = sb_w / sb_h

if curr_ratio > target_ratio:
    # 宽度过大，裁剪两侧
    new_w = int(sb_h * target_ratio)
    left = (sb_w - new_w) // 2
    crop_box = (left, 0, left + new_w, sb_h)
else:
    # 高度过大，裁剪上下
    new_h = int(sb_w / target_ratio)
    top = (sb_h - new_h) // 2
    crop_box = (0, top, sb_w, top + new_h)

cropped_sidebar = img_sidebar.crop(crop_box)
sidebar_resized = cropped_sidebar.resize((164, 314), Image.Resampling.LANCZOS)
sidebar_resized.save(os.path.join(output_nsis_dir, "sidebar.bmp"), format="BMP")

# 3. 处理 NSIS 顶部横幅图片 (150 x 57 BMP, 24-bit RGB)
# 制作一个带有深色 Fluent 渐变背景并在右侧放置精致 Logo 的 header 横幅
header_img = Image.new("RGB", (150, 57), color=(24, 28, 36))
# 取 48x48 的 logo 贴在右侧 (居中)
logo_small = img_icon.resize((45, 45), Image.Resampling.LANCZOS).convert("RGB")
header_img.paste(logo_small, (150 - 45 - 6, (57 - 45) // 2))
header_img.save(os.path.join(output_nsis_dir, "header.bmp"), format="BMP")

print("所有图标与 NSIS 资源生成完成！")
