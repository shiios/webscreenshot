// 全局变量，用于控制截图是否应该停止
let shouldStopCapture = false;

// 获取DOM元素
const captureBtn = document.getElementById('captureBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');

// 开始截图按钮事件
captureBtn.addEventListener('click', async () => {
  // 初始化停止标志
  shouldStopCapture = false;
  
  // 更新UI状态
  captureBtn.disabled = true;
  captureBtn.textContent = '截图中...';
  stopBtn.disabled = false;
  status.textContent = '正在准备截图...';
  
  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 检查URL是否为受保护的URL（如chrome://, edge://, about:等）
    const url = tab.url;
    if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) {
      throw new Error('无法对受保护的浏览器页面进行截图，请在普通网页上使用此功能。');
    }
    
    // 调用滚动截图函数
    await captureFullPage(tab.id);
    
    status.textContent = '截图成功！已下载。';
  } catch (error) {
    console.error('截图出错:', error);
    status.textContent = '截图出错：' + error.message;
  } finally {
    // 恢复UI状态
    captureBtn.disabled = false;
    captureBtn.textContent = '开始截图';
    stopBtn.disabled = true;
    // 重置停止标志
    shouldStopCapture = false;
  }
});

// 结束截图按钮事件
stopBtn.addEventListener('click', () => {
  shouldStopCapture = true;
  status.textContent = '正在结束截图，正在保存已截图内容...';
});

// 滚动截图的核心函数
async function captureFullPage(tabId) {
  try {
    // 1. 先获取页面信息
    const pageInfo = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // 保存原始样式
        window.originalStyles = {
          overflow: document.body.style.overflow,
          height: document.body.style.height
        };
        
        // 修改样式以允许完整滚动
        document.body.style.overflow = 'hidden';
        
        // 获取页面尺寸
        return {
          fullHeight: Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.offsetHeight,
            document.body.clientHeight,
            document.documentElement.clientHeight
          ),
          fullWidth: Math.max(
            document.body.scrollWidth,
            document.documentElement.scrollWidth,
            document.body.offsetWidth,
            document.documentElement.offsetWidth,
            document.body.clientWidth,
            document.documentElement.clientWidth
          ),
          viewportHeight: window.innerHeight
        };
      }
    });
    
    let { fullHeight, fullWidth, viewportHeight } = pageInfo[0].result;
    const scrollStep = viewportHeight - 20; // 减小滚动步长，避免重叠
    let currentPosition = 0;
    
    // 2. 创建canvas用于拼接截图
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = fullWidth;
    canvas.height = fullHeight;
    
    // 3. 逐段截图并拼接
    const screenshots = [];
    
    while (currentPosition < fullHeight) {
      // 检查是否需要停止截图
      if (shouldStopCapture) {
        console.log('用户请求停止截图，正在保存已截图内容...');
        break;
      }
      
      // 滚动到当前位置
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (position) => {
          window.scrollTo(0, position);
        },
        args: [currentPosition]
      });
      
      // 等待页面渲染
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 1000)); // 增加延迟，避免配额问题
      
      // 截图当前视口 - 使用chrome.tabs.captureVisibleTab，提高截图质量
      const screenshotUrl = await chrome.tabs.captureVisibleTab({
        format: 'png',
        quality: 100
      });
      
      screenshots.push({
        url: screenshotUrl,
        y: currentPosition
      });
      
      // 移动到下一个位置，确保不超过页面高度
      if (currentPosition + scrollStep < fullHeight) {
        currentPosition += scrollStep;
      } else {
        // 如果下一次滚动会超过页面高度，直接滚动到页面底部
        currentPosition = fullHeight - viewportHeight;
        // 确保不出现负数
        currentPosition = Math.max(0, currentPosition);
        // 标记为最后一次循环
        if (currentPosition === fullHeight - viewportHeight) {
          break;
        }
      }
      
      // 如果是最后一段或用户请求停止，不需要再等待
      if (currentPosition < fullHeight - viewportHeight && !shouldStopCapture) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // 增加截图间隔，避免配额问题
      }
    }
    
    // 确保最后一屏也被捕获
    if (!shouldStopCapture && currentPosition < fullHeight) {
      // 滚动到页面底部
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          window.scrollTo(0, document.body.scrollHeight);
        }
      });
      
      // 等待页面渲染
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 截图最后一屏
      const lastScreenshotUrl = await chrome.tabs.captureVisibleTab({
        format: 'png',
        quality: 100
      });
      
      screenshots.push({
        url: lastScreenshotUrl,
        y: fullHeight - viewportHeight
      });
    }
    
    // 如果没有截取到任何内容，抛出错误
    if (screenshots.length === 0) {
      throw new Error('未能获取任何截图内容');
    }
    
    // 4. 恢复页面原始状态
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // 恢复原始样式
        if (window.originalStyles) {
          document.body.style.overflow = window.originalStyles.overflow || '';
          document.body.style.height = window.originalStyles.height || '';
          delete window.originalStyles;
        }
        // 恢复滚动位置
        window.scrollTo(0, 0);
      }
    });
    
    // 5. 拼接所有截图到临时canvas
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = fullWidth;
    tempCanvas.height = fullHeight;
    
    for (const screenshot of screenshots) {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = screenshot.url;
      });
      
      // 计算绘制高度
      const drawHeight = Math.min(scrollStep, fullHeight - screenshot.y);
      tempCtx.drawImage(img, 0, screenshot.y, fullWidth, drawHeight);
    }
    
    // 6. 检测并裁剪末尾空白区域
    const actualHeight = findActualContentHeight(tempCanvas, fullWidth, fullHeight);
    
    if (actualHeight < fullHeight) {
      // 创建裁剪后的canvas
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      finalCanvas.width = fullWidth;
      finalCanvas.height = actualHeight;
      
      // 将内容复制到新canvas
      finalCtx.drawImage(tempCanvas, 0, 0, fullWidth, actualHeight, 0, 0, fullWidth, actualHeight);
      
      // 转换为dataURL
      const screenshot = finalCanvas.toDataURL('image/png');
      
      if (screenshot === 'data:,') {
        throw new Error('生成截图失败，canvas返回空数据');
      }
      
      // 将截图下载
      downloadScreenshot(screenshot);
    } else {
      // 没有需要裁剪的内容，直接下载
      const screenshot = tempCanvas.toDataURL('image/png');
      
      if (screenshot === 'data:,') {
        throw new Error('生成截图失败，canvas返回空数据');
      }
      
      // 将截图下载
      downloadScreenshot(screenshot);
    }
    
    return true;
  } catch (error) {
    console.error('滚动截图失败:', error);
    // 确保恢复原始状态（双重保障）
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          // 恢复样式，即使window.originalStyles不存在
          document.body.style.overflow = '';
          document.body.style.height = '';
          window.scrollTo(0, 0);
        }
      });
    } catch (e) {
      console.error('最终恢复样式失败:', e);
    }
    throw error;
  }
}

// 查找实际内容高度（从底部向上扫描，跳过空白行）
function findActualContentHeight(canvas, width, height) {
  try {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // 从底部向上扫描
    for (let y = height - 1; y >= 0; y--) {
      let hasContent = false;
      
      // 检查这一行是否有非白色像素
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        // 检查像素是否不是白色（或接近白色）
        // 白色阈值：R>250, G>250, B>250
        if (r < 250 || g < 250 || b < 250) {
          hasContent = true;
          break;
        }
      }
      
      // 跳过纯白色行
      if (hasContent) {
        // 找到内容底部，添加一些边距
        return y + 50; // 添加50像素边距
      }
    }
    
    // 如果没找到内容，返回原始高度的一半
    return Math.floor(height / 2);
  } catch (error) {
    console.error('检测内容高度失败:', error);
    return height;
  }
}

// 下载截图
function downloadScreenshot(dataUrl) {
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `网页截图_${new Date().getTime()}.png`;
    
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    document.body.appendChild(a);
    a.dispatchEvent(event);
    
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  } catch (downloadError) {
    console.error('下载截图失败:', downloadError);
    throw new Error('截图生成成功，但下载失败');
  }
}