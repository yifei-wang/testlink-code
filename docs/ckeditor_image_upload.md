# CKEditor 图片粘贴与上传功能部署文档

## 概述

本文档说明如何使用 CKEditor 内置功能实现图片粘贴与上传。用户可以通过：
- 截图后直接 Ctrl+V 粘贴到编辑器
- 点击工具栏的"插入图片"按钮上传
- 从文件管理器复制图片粘贴

## 方案对比

| 方案 | 说明 | 选择 |
|------|------|------|
| 自定义 pasteimage 插件 | 需要额外 JS 插件 | ❌ |
| CKEditor 内置功能 | `clipboard_handleImages` + 自定义上传处理 | ✅ **已采用** |

---

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (前端)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ pasteimage  │  │   CKEditor   │  │  截图/复制图片     │  │
│  │  plugin.js  │──│   Config     │←──│  (Ctrl+V)         │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ POST (multipart/form-data)
                            │ upload=画像文件
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Docker Container (后端)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  lib/ckeditor_upload.php                             │  │
│  │  - 文件类型验证 (jpg,png,gif,webp,bmp)              │  │
│  │  - 文件大小限制 (5MB)                                │  │
│  │  - 目录权限检查 (0755)                               │  │
│  │  - 唯一文件名生成                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  上传目录: /var/testlink/upload_area/ckeditor_images/        │
│  Web路径:  /upload_area/ckeditor_images/xxx.png              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Docker Volume 持久化
                            ▼
                  ./upload_area/ckeditor_images/
```

---

## 文件结构

```
testlink-code/
├── upload_area/
│   ├── ckeditor_upload.php                     # PHP 上传处理器
│   └── ckeditor_images/                         # 上传的图片存储目录
├── cfg/
│   └── tl_ckeditor_config.js                   # CKEditor 配置（修改）
├── docker-compose.yml                          # Docker 编排（修改）
└── Dockerfile                                  # 镜像构建（修改）
```

---

## 部署步骤

### 1. 文件准备

#### 1.1 创建上传处理器 `upload_area/ckeditor_upload.php`
该文件位于 `upload_area/` 目录下，这是一个通过 Docker 挂载的持久化存储目录。
```php
<?php
header('Content-Type: application/json');

$response = [
    'uploaded' => 0,
    'error' => ['message' => '']
];

// 检查文件是否上传
if (!isset($_FILES['upload']) || $_FILES['upload']['error'] !== UPLOAD_ERR_OK) {
    $response['error']['message'] = isset($_FILES['upload']) ? 'Upload error: ' . $_FILES['upload']['error'] : 'No file uploaded';
    echo json_encode($response);
    exit;
}

$file = $_FILES['upload'];
$fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

// 验证文件类型
$allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
if (!in_array($fileExt, $allowedTypes)) {
    $response['error']['message'] = 'Invalid file type. Only images are allowed.';
    echo json_encode($response);
    exit;
}

// 验证文件大小 (5MB 限制)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    $response['error']['message'] = 'File too large. Maximum size is 5MB.';
    echo json_encode($response);
    exit;
}

// 上传目录（使用已挂载的 upload_area）
$uploadDir = '/var/testlink/upload_area/ckeditor_images/';

// 创建目录
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        $response['error']['message'] = 'Failed to create upload directory';
        echo json_encode($response);
        exit;
    }
}

// 生成唯一文件名
$baseName = 'ckeditor_' . time() . '_' . substr(md5(uniqid()), 0, 8);
$fileName = $baseName . '.' . $fileExt;

// Web 可访问路径
$webPath = '/upload_area/ckeditor_images/' . $fileName;

// 移动上传文件
$destination = $uploadDir . $fileName;
if (!move_uploaded_file($file['tmp_name'], $destination)) {
    $response['error']['message'] = 'Failed to save uploaded file';
    echo json_encode($response);
    exit;
}

// 成功响应
$response = [
    'uploaded' => 1,
    'fileName' => $fileName,
    'url' => $webPath
];

echo json_encode($response);
```

#### 1.2 修改 CKEditor 配置 `cfg/tl_ckeditor_config.js`
在 `CKEDITOR.editorConfig` 函数中添加：
```javascript
// 启用 CKEditor 内置图片粘贴功能
config.clipboard_handleImages = true;

// 配置图片上传 URL（粘贴和插入图片对话框都使用）
// 注意：fRoot 可能以 / 结尾，需要去除
var uploadPath = fRoot.replace(/\/+$/, '') + '/upload_area/ckeditor_upload.php?responseType=json';
config.filebrowserImageUploadUrl = uploadPath;
```

#### 1.3 修改 Dockerfile
添加 Apache 配置以允许访问 upload_area：
```dockerfile
# 创建符号链接使 upload_area 可通过 Web 访问
RUN ln -s /var/testlink/upload_area /var/www/html/upload_area

# 创建 Apache 配置
RUN printf '# TestLink Upload Area Configuration\n\n' > /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '<Directory /var/testlink/upload_area>\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '    Options Indexes FollowSymLinks\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '    Require all granted\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '</Directory>\n\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '<Files "ckeditor_upload.php">\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '    Require all granted\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    printf '</Files>\n' >> /etc/apache2/conf-available/testlink-upload-area.conf && \
    a2enconf testlink-upload-area
```

---

### 2. 重建容器

```bash
docker-compose down
docker-compose up --build -d
```

---

### 3. 验证功能

#### 3.1 访问 TestLink
```
http://localhost:8090
```

#### 3.2 验证 Apache 配置
检查上传目录是否可通过 Web 访问：
```
http://localhost:8090/upload_area/ckeditor_images/
```
应该能看到已上传的图片文件列表。

#### 3.3 测试图片粘贴
1. 登录 TestLink
2. 进入任一测试用例编辑页面
3. 截图或复制图片
4. 按 Ctrl+V 粘贴到 CKEditor 编辑器
5. 图片应自动上传并显示

#### 3.4 检查上传文件
```bash
ls -la ./upload_area/ckeditor_images/
```

---

## 安全特性

| 特性 | 说明 |
|------|------|
| 文件类型白名单 | 仅允许 jpg, jpeg, png, gif, webp, bmp |
| 文件大小限制 | 5MB |
| 目录权限 | 0755（所有者可写，其他只读） |
| 唯一文件名 | 时间戳 + MD5 组合 |
| JSON 安全输出 | 使用 `json_encode()` 防止 XSS |
| 路径遍历防护 | 硬编码目录 + 生成文件名 |

---

## 浏览器兼容性

| 功能 | 要求 |
|------|------|
| 剪贴板 File API | 现代浏览器 (Chrome/Firefox/Edge 新版) |
| Base64 转换 | 支持 `fetch` 和 `Blob` 的浏览器 |
| CKEditor | 版本 4.x |

---

## 故障排查

### 问题：上传失败 - "Failed to save uploaded file"

**常见原因：**

1. **目录权限不足**
   ```bash
   # 检查宿主机目录权限
   ls -la ./upload_area/

   # 修复权限
   chmod -R 755 ./upload_area/
   sudo chown -R $(whoami):$(whoami) ./upload_area/
   ```

2. **容器内 www-data 用户权限**
   ```bash
   # 进入容器检查
   sudo docker-compose exec app bash

   # 检查目录权限
   ls -la /var/testlink/upload_area/
   ls -la /var/testlink/upload_area/ckeditor_images/

   # 修复容器内权限
   chown -R www-data:www-data /var/testlink/upload_area/
   chmod -R 755 /var/testlink/upload_area/
   ```

3. **SELinux/AppArmor 限制**
   ```bash
   # 临时禁用 SELinux 测试（仅测试用）
   sudo setenforce 0

   # 或给目录添加 SELinux 上下文
   sudo chcon -R -t httpd_sys_rw_content_t ./upload_area/
   ```

4. **查看详细错误日志**
   ```bash
   # 容器 PHP 日志
   sudo docker-compose logs app | grep ckeditor_upload

   # Apache 错误日志
   sudo docker-compose exec app tail -f /var/log/apache2/error.log
   ```

---

### 问题：粘贴后无反应
- 检查浏览器控制台是否有 JavaScript 错误
- 确认 `pasteimage` 插件已正确加载
- 清除浏览器缓存后重试

### 问题：上传失败
- 检查 `/var/testlink/upload_area/` 目录权限
- 查看容器日志：`docker-compose logs app`
- 验证 PHP 上传限制：查看 `php.ini` 中的 `upload_max_filesize`

### 问题：图片无法显示
- 确认软链接已创建：`docker-compose exec app ls -la /var/www/html/upload_area`
- 检查 Web 服务器配置确保允许访问 `/upload_area`

---

## 后续优化建议

1. **国际化**：将 plugin.js 中的中文提示移至可配置的多语言字符串
2. **进度显示**：添加上传进度条提示
3. **压缩优化**：对上传图片进行自动压缩
4. **文件清理**：定期清理未使用的上传图片
5. **日志记录**：记录上传操作便于审计

---

## 版本历史

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-03-26 | 1.0 | 初始版本 - 支持剪贴板图片粘贴上传 |
