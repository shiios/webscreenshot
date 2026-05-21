from PIL import Image, ImageDraw, ImageFont

# 创建基础图标
for size in [16, 48, 128]:
    # 创建空白图像
    img = Image.new('RGB', (size, size), color='#4CAF50')
    draw = ImageDraw.Draw(img)
    
    # 绘制简单的相机图标
    # 相机主体
    camera_width = size // 2
    camera_height = size // 2
    camera_x = (size - camera_width) // 2
    camera_y = (size - camera_height) // 2
    draw.rectangle([camera_x, camera_y, camera_x + camera_width, camera_y + camera_height], 
                   fill='white', outline='white', width=size//20)
    
    # 镜头
    lens_size = size // 4
    lens_x = (size - lens_size) // 2
    lens_y = (size - lens_size) // 2
    draw.ellipse([lens_x, lens_y, lens_x + lens_size, lens_y + lens_size], 
                 fill='#333333')
    
    # 镜头内部
    inner_lens_size = size // 8
    inner_lens_x = (size - inner_lens_size) // 2
    inner_lens_y = (size - inner_lens_size) // 2
    draw.ellipse([inner_lens_x, inner_lens_y, inner_lens_x + inner_lens_size, inner_lens_y + inner_lens_size], 
                 fill='white')
    
    # 保存图标
    img.save(f'icon{size}.png')
    print(f'Created icon{size}.png')

print('All icons created successfully!')