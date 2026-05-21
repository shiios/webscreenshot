// 后台服务 worker
console.log('滚动截图插件已启动');

// 监听插件安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('滚动截图插件已安装');
});

// 监听消息事件
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture') {
    console.log('收到截图请求');
    // 可以在这里添加额外的截图逻辑
    sendResponse({ success: true });
  }
});