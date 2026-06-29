/**
 * 绵阳市荣盛科技有限公司 - 官网管理后台服务端
 * 技术栈: Node.js + Express + JSON文件存储 + JWT认证
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// ==================== 基础配置 ====================

// JWT 密钥
const JWT_SECRET = 'rongsheng-admin-secret-key-2024';

// 管理员账号（密码使用 bcrypt 加密）
const ADMIN_USER = {
  username: 'admin',
  // 123456 的 bcrypt 哈希
  passwordHash: bcrypt.hashSync('123456', 10)
};

// ==================== 中间件配置 ====================

// CORS 允许所有来源（开发阶段）
app.use(cors());

// 解析 JSON 请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== 静态文件服务 ====================

// 主站根目录（index.html、styles.css、script.js）
app.use('/', express.static(path.join(__dirname, '../')));

// 管理后台页面
app.use('/admin', express.static(path.join(__dirname, '../admin/')));

// 上传文件目录
app.use('/uploads', express.static(path.join(__dirname, './uploads/')));

// 已有图片目录
app.use('/imgs/culture', express.static(path.join(__dirname, '../images/culture/')));
app.use('/imgs/banner', express.static(path.join(__dirname, '../images/banner/')));
app.use('/imgs/honors', express.static(path.join(__dirname, '../images/honors/')));
app.use('/imgs/company', express.static(path.join(__dirname, '../images/company/')));
app.use('/imgs/warehouse', express.static(path.join(__dirname, '../images/warehouse/')));
app.use('/imgs/lab', express.static(path.join(__dirname, '../images/lab/')));
app.use('/imgs/certificates', express.static(path.join(__dirname, '../images/certificates/')));
app.use('/imgs/authorization', express.static(path.join(__dirname, '../images/authorization/')));
app.use('/imgs/products', express.static(path.join(__dirname, '../images/products/')));
app.use('/imgs/news', express.static(path.join(__dirname, '../images/news/')));
app.use('/imgs/staff', express.static(path.join(__dirname, '../images/staff/')));
app.use('/images', express.static(path.join(__dirname, '../images/')));

// JSON 数据文件（仅 GET 访问）
app.use('/data', express.static(path.join(__dirname, './data/')));

// ==================== 文件上传配置（Multer） ====================

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, './uploads/');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 文件名格式：时间戳-原始文件名
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${timestamp}-${originalName}`);
  }
});

// 文件过滤：仅允许图片类型
const fileFilter = function (req, file, cb) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅允许上传 jpg/jpeg/png/gif/webp 格式的图片'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制 5MB
  }
});

// ==================== 工具函数 ====================

/**
 * 读取 JSON 数据文件
 * @param {string} filename - 文件名（如 news.json）
 * @returns {any} 解析后的 JSON 数据
 */
function readData(filename) {
  const filePath = path.join(__dirname, './data/', filename);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`读取文件 ${filename} 失败:`, err.message);
    return null;
  }
}

/**
 * 写入 JSON 数据文件
 * @param {string} filename - 文件名
 * @param {any} data - 要写入的数据
 */
function writeData(filename, data) {
  const filePath = path.join(__dirname, './data/', filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`写入文件 ${filename} 失败:`, err.message);
    return false;
  }
}

/**
 * 生成简单唯一 ID
 * @returns {string} 唯一ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 统一错误响应格式
 * @param {object} res - Express response 对象
 * @param {number} status - HTTP 状态码
 * @param {string} message - 错误信息
 */
function errorResponse(res, status, message) {
  return res.status(status).json({ success: false, message });
}

/**
 * 统一成功响应格式
 * @param {object} res - Express response 对象
 * @param {any} data - 返回数据
 * @param {string} message - 成功信息
 */
function successResponse(res, data, message = '操作成功') {
  return res.json({ success: true, message, data });
}

// ==================== 认证中间件 ====================

/**
 * JWT 认证中间件
 * 验证 Authorization: Bearer <token>
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 401, '未提供认证令牌');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return errorResponse(res, 401, '认证令牌无效或已过期');
  }
}

// ==================== API 路由：认证 ====================

/**
 * POST /api/login - 管理员登录
 */
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return errorResponse(res, 400, '请输入用户名和密码');
    }

    // 验证用户名
    if (username !== ADMIN_USER.username) {
      return errorResponse(res, 401, '用户名或密码错误');
    }

    // 验证密码
    const isMatch = bcrypt.compareSync(password, ADMIN_USER.passwordHash);
    if (!isMatch) {
      return errorResponse(res, 401, '用户名或密码错误');
    }

    // 签发 JWT token，有效期24小时
    const token = jwt.sign(
      { username: ADMIN_USER.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    successResponse(res, { token, admin: { username: ADMIN_USER.username } }, '登录成功');
  } catch (err) {
    console.error('登录错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

// ==================== API 路由：新闻管理 ====================

/**
 * GET /api/news - 获取所有新闻列表（按日期倒序）
 */
app.get('/api/news', (req, res) => {
  try {
    const news = readData('news.json');
    if (news === null) {
      return errorResponse(res, 500, '读取新闻数据失败');
    }
    // 按日期倒序排列
    const sorted = news.sort((a, b) => new Date(b.date) - new Date(a.date));
    successResponse(res, sorted);
  } catch (err) {
    console.error('获取新闻列表错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * GET /api/news/:id - 获取单条新闻
 */
app.get('/api/news/:id', (req, res) => {
  try {
    const news = readData('news.json');
    if (news === null) {
      return errorResponse(res, 500, '读取新闻数据失败');
    }
    const item = news.find(n => n.id === req.params.id);
    if (!item) {
      return errorResponse(res, 404, '新闻不存在');
    }
    successResponse(res, item);
  } catch (err) {
    console.error('获取新闻详情错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * POST /api/news - 创建新闻（需认证）
 */
app.post('/api/news', authMiddleware, (req, res) => {
  try {
    const { title, summary, content, image, date } = req.body;

    if (!title || !content) {
      return errorResponse(res, 400, '标题和内容不能为空');
    }

    const news = readData('news.json') || [];
    const now = new Date().toISOString();

    const newItem = {
      id: generateId(),
      title,
      summary: summary || '',
      content,
      image: image || '',
      date: date || new Date().toISOString().split('T')[0],
      createdAt: now,
      updatedAt: now
    };

    news.push(newItem);

    if (!writeData('news.json', news)) {
      return errorResponse(res, 500, '保存新闻数据失败');
    }

    successResponse(res, newItem, '新闻创建成功');
  } catch (err) {
    console.error('创建新闻错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * PUT /api/news/:id - 更新新闻（需认证）
 */
app.put('/api/news/:id', authMiddleware, (req, res) => {
  try {
    const news = readData('news.json');
    if (news === null) {
      return errorResponse(res, 500, '读取新闻数据失败');
    }

    const index = news.findIndex(n => n.id === req.params.id);
    if (index === -1) {
      return errorResponse(res, 404, '新闻不存在');
    }

    const { title, summary, content, image, date } = req.body;
    const updated = {
      ...news[index],
      ...(title !== undefined && { title }),
      ...(summary !== undefined && { summary }),
      ...(content !== undefined && { content }),
      ...(image !== undefined && { image }),
      ...(date !== undefined && { date }),
      updatedAt: new Date().toISOString()
    };

    news[index] = updated;

    if (!writeData('news.json', news)) {
      return errorResponse(res, 500, '保存新闻数据失败');
    }

    successResponse(res, updated, '新闻更新成功');
  } catch (err) {
    console.error('更新新闻错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * DELETE /api/news/:id - 删除新闻（需认证）
 */
app.delete('/api/news/:id', authMiddleware, (req, res) => {
  try {
    const news = readData('news.json');
    if (news === null) {
      return errorResponse(res, 500, '读取新闻数据失败');
    }

    const index = news.findIndex(n => n.id === req.params.id);
    if (index === -1) {
      return errorResponse(res, 404, '新闻不存在');
    }

    news.splice(index, 1);

    if (!writeData('news.json', news)) {
      return errorResponse(res, 500, '保存新闻数据失败');
    }

    successResponse(res, null, '新闻删除成功');
  } catch (err) {
    console.error('删除新闻错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

// ==================== API 路由：轮播图管理 ====================

/**
 * GET /api/carousel - 获取轮播图列表（按 order 排序）
 */
app.get('/api/carousel', (req, res) => {
  try {
    const carousel = readData('carousel.json');
    if (carousel === null) {
      return errorResponse(res, 500, '读取轮播图数据失败');
    }
    const sorted = carousel.sort((a, b) => a.order - b.order);
    successResponse(res, sorted);
  } catch (err) {
    console.error('获取轮播图列表错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * POST /api/carousel - 添加轮播图（需认证）
 */
app.post('/api/carousel', authMiddleware, (req, res) => {
  try {
    const { title, subtitle, description, image, buttonText, buttonLink } = req.body;

    if (!title) {
      return errorResponse(res, 400, '标题不能为空');
    }

    const carousel = readData('carousel.json') || [];

    // 自动计算 order（放在最后）
    const maxOrder = carousel.length > 0 ? Math.max(...carousel.map(c => c.order)) : 0;

    const newItem = {
      id: generateId(),
      title,
      subtitle: subtitle || '',
      description: description || '',
      image: image || '',
      buttonText: buttonText || '了解更多',
      buttonLink: buttonLink || '#',
      order: maxOrder + 1
    };

    carousel.push(newItem);

    if (!writeData('carousel.json', carousel)) {
      return errorResponse(res, 500, '保存轮播图数据失败');
    }

    successResponse(res, newItem, '轮播图添加成功');
  } catch (err) {
    console.error('添加轮播图错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * PUT /api/carousel/reorder - 重新排序轮播图（需认证）
 * 注意：此路由需要放在 /api/carousel/:id 之前
 */
app.put('/api/carousel/reorder', authMiddleware, (req, res) => {
  try {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return errorResponse(res, 400, '请提供排序数据');
    }

    const carousel = readData('carousel.json');
    if (carousel === null) {
      return errorResponse(res, 500, '读取轮播图数据失败');
    }

    // 更新排序
    orders.forEach(item => {
      const found = carousel.find(c => c.id === item.id);
      if (found) {
        found.order = item.order;
      }
    });

    if (!writeData('carousel.json', carousel)) {
      return errorResponse(res, 500, '保存轮播图数据失败');
    }

    const sorted = carousel.sort((a, b) => a.order - b.order);
    successResponse(res, sorted, '轮播图排序更新成功');
  } catch (err) {
    console.error('轮播图排序错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * PUT /api/carousel/:id - 更新轮播图（需认证）
 */
app.put('/api/carousel/:id', authMiddleware, (req, res) => {
  try {
    const carousel = readData('carousel.json');
    if (carousel === null) {
      return errorResponse(res, 500, '读取轮播图数据失败');
    }

    const index = carousel.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return errorResponse(res, 404, '轮播图不存在');
    }

    const { title, subtitle, description, image, buttonText, buttonLink, order } = req.body;
    const updated = {
      ...carousel[index],
      ...(title !== undefined && { title }),
      ...(subtitle !== undefined && { subtitle }),
      ...(description !== undefined && { description }),
      ...(image !== undefined && { image }),
      ...(buttonText !== undefined && { buttonText }),
      ...(buttonLink !== undefined && { buttonLink }),
      ...(order !== undefined && { order })
    };

    carousel[index] = updated;

    if (!writeData('carousel.json', carousel)) {
      return errorResponse(res, 500, '保存轮播图数据失败');
    }

    successResponse(res, updated, '轮播图更新成功');
  } catch (err) {
    console.error('更新轮播图错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * DELETE /api/carousel/:id - 删除轮播图（需认证）
 */
app.delete('/api/carousel/:id', authMiddleware, (req, res) => {
  try {
    const carousel = readData('carousel.json');
    if (carousel === null) {
      return errorResponse(res, 500, '读取轮播图数据失败');
    }

    const index = carousel.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return errorResponse(res, 404, '轮播图不存在');
    }

    carousel.splice(index, 1);

    if (!writeData('carousel.json', carousel)) {
      return errorResponse(res, 500, '保存轮播图数据失败');
    }

    successResponse(res, null, '轮播图删除成功');
  } catch (err) {
    console.error('删除轮播图错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

// ==================== API 路由：产品/业务管理 ====================

/**
 * GET /api/products - 获取产品列表
 */
app.get('/api/products', (req, res) => {
  try {
    const data = readData('products.json');
    if (data === null) {
      return errorResponse(res, 500, '读取产品数据失败');
    }
    successResponse(res, data);
  } catch (err) {
    console.error('获取产品列表错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * PUT /api/products/:id - 更新产品信息（需认证）
 */
app.put('/api/products/:id', authMiddleware, (req, res) => {
  try {
    const data = readData('products.json');
    if (data === null) {
      return errorResponse(res, 500, '读取产品数据失败');
    }

    const index = data.products.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return errorResponse(res, 404, '产品不存在');
    }

    const { title, description, image, features, icon } = req.body;
    const updated = {
      ...data.products[index],
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(image !== undefined && { image }),
      ...(features !== undefined && { features }),
      ...(icon !== undefined && { icon })
    };

    data.products[index] = updated;

    if (!writeData('products.json', data)) {
      return errorResponse(res, 500, '保存产品数据失败');
    }

    successResponse(res, updated, '产品更新成功');
  } catch (err) {
    console.error('更新产品错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * PUT /api/products/brands - 更新品牌列表（需认证）
 * 注意：此路由需要放在 /api/products/:id 之前处理
 */
app.put('/api/products-brands', authMiddleware, (req, res) => {
  try {
    const data = readData('products.json');
    if (data === null) {
      return errorResponse(res, 500, '读取产品数据失败');
    }

    const { categories } = req.body;
    if (!categories || !Array.isArray(categories)) {
      return errorResponse(res, 400, '请提供品牌分类数据');
    }

    data.brands = { categories };

    if (!writeData('products.json', data)) {
      return errorResponse(res, 500, '保存品牌数据失败');
    }

    successResponse(res, data.brands, '品牌列表更新成功');
  } catch (err) {
    console.error('更新品牌列表错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

// ==================== API 路由：产品展厅（常卖品） ====================

/**
 * GET /api/showroom - 获取产品展厅数据（公开接口，仅返回已发布项）
 */
app.get('/api/showroom', (req, res) => {
  try {
    const data = readData('showroom.json');
    if (data === null) {
      return errorResponse(res, 500, '读取产品展厅数据失败');
    }

    const items = (data.items || [])
      .filter(item => item.published !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    successResponse(res, {
      categories: data.categories || [],
      items
    });
  } catch (err) {
    console.error('获取产品展厅错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * GET /api/showroom/all - 获取全部展厅数据（含未发布，需认证）
 */
app.get('/api/showroom/all', authMiddleware, (req, res) => {
  try {
    const data = readData('showroom.json');
    if (data === null) {
      return errorResponse(res, 500, '读取产品展厅数据失败');
    }
    successResponse(res, data);
  } catch (err) {
    console.error('获取产品展厅（管理）错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * POST /api/showroom - 添加常卖品（需认证）
 */
app.post('/api/showroom', authMiddleware, (req, res) => {
  try {
    const data = readData('showroom.json') || { categories: [], items: [] };
    const { name, category, brand, spec, description, image, tags, hot, order, published } = req.body;

    if (!name || !category) {
      return errorResponse(res, 400, '产品名称和分类不能为空');
    }

    const maxOrder = data.items.length > 0
      ? Math.max(...data.items.map(i => i.order || 0))
      : 0;

    const newItem = {
      id: generateId(),
      name,
      category,
      brand: brand || '',
      spec: spec || '',
      description: description || '',
      image: image || '',
      tags: Array.isArray(tags) ? tags : [],
      hot: hot === true,
      order: order !== undefined ? order : maxOrder + 1,
      published: published !== false
    };

    data.items.push(newItem);

    if (!writeData('showroom.json', data)) {
      return errorResponse(res, 500, '保存产品展厅数据失败');
    }

    successResponse(res, newItem, '常卖品添加成功');
  } catch (err) {
    console.error('添加常卖品错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * PUT /api/showroom/:id - 更新常卖品（需认证）
 */
app.put('/api/showroom/:id', authMiddleware, (req, res) => {
  try {
    const data = readData('showroom.json');
    if (data === null) {
      return errorResponse(res, 500, '读取产品展厅数据失败');
    }

    const index = data.items.findIndex(i => i.id === req.params.id);
    if (index === -1) {
      return errorResponse(res, 404, '常卖品不存在');
    }

    const { name, category, brand, spec, description, image, tags, hot, order, published } = req.body;
    const updated = {
      ...data.items[index],
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(brand !== undefined && { brand }),
      ...(spec !== undefined && { spec }),
      ...(description !== undefined && { description }),
      ...(image !== undefined && { image }),
      ...(tags !== undefined && { tags }),
      ...(hot !== undefined && { hot }),
      ...(order !== undefined && { order }),
      ...(published !== undefined && { published })
    };

    data.items[index] = updated;

    if (!writeData('showroom.json', data)) {
      return errorResponse(res, 500, '保存产品展厅数据失败');
    }

    successResponse(res, updated, '常卖品更新成功');
  } catch (err) {
    console.error('更新常卖品错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * DELETE /api/showroom/:id - 删除常卖品（需认证）
 */
app.delete('/api/showroom/:id', authMiddleware, (req, res) => {
  try {
    const data = readData('showroom.json');
    if (data === null) {
      return errorResponse(res, 500, '读取产品展厅数据失败');
    }

    const index = data.items.findIndex(i => i.id === req.params.id);
    if (index === -1) {
      return errorResponse(res, 404, '常卖品不存在');
    }

    data.items.splice(index, 1);

    if (!writeData('showroom.json', data)) {
      return errorResponse(res, 500, '保存产品展厅数据失败');
    }

    successResponse(res, null, '常卖品删除成功');
  } catch (err) {
    console.error('删除常卖品错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

// ==================== API 路由：公司信息管理 ====================

/**
 * GET /api/company - 获取公司信息
 */
app.get('/api/company', (req, res) => {
  try {
    const company = readData('company.json');
    if (company === null) {
      return errorResponse(res, 500, '读取公司信息失败');
    }
    successResponse(res, company);
  } catch (err) {
    console.error('获取公司信息错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * PUT /api/company - 更新公司信息（需认证）
 */
app.put('/api/company', authMiddleware, (req, res) => {
  try {
    const company = readData('company.json');
    if (company === null) {
      return errorResponse(res, 500, '读取公司信息失败');
    }

    // 合并更新字段
    const updated = { ...company, ...req.body };

    if (!writeData('company.json', updated)) {
      return errorResponse(res, 500, '保存公司信息失败');
    }

    successResponse(res, updated, '公司信息更新成功');
  } catch (err) {
    console.error('更新公司信息错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

// ==================== API 路由：品牌授权管理 ====================

/**
 * GET /api/authorization - 获取品牌授权数据
 */
app.get('/api/authorization', (req, res) => {
  try {
    const data = readData('authorization.json');
    if (data === null) {
      return errorResponse(res, 500, '读取品牌授权数据失败');
    }
    successResponse(res, data);
  } catch (err) {
    console.error('获取品牌授权错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * POST /api/authorization - 新增授权书（需认证）
 */
app.post('/api/authorization', authMiddleware, (req, res) => {
  try {
    const { category, brand, brand_en, image } = req.body;

    if (!category || !brand || !image) {
      return errorResponse(res, 400, '分类、品牌名和图片不能为空');
    }

    const data = readData('authorization.json') || { categories: [], items: [] };
    const maxId = data.items.length > 0 ? Math.max(...data.items.map(i => i.id)) : 0;
    const categoryItems = data.items.filter(i => i.category === category);
    const maxOrder = categoryItems.length > 0 ? Math.max(...categoryItems.map(i => i.order)) : 0;

    const newItem = {
      id: maxId + 1,
      category,
      brand,
      brand_en: brand_en || '',
      image,
      order: maxOrder + 1
    };

    data.items.push(newItem);

    if (!writeData('authorization.json', data)) {
      return errorResponse(res, 500, '保存授权数据失败');
    }

    successResponse(res, newItem, '授权书添加成功');
  } catch (err) {
    console.error('添加授权书错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * PUT /api/authorization/:id - 修改授权书（需认证）
 */
app.put('/api/authorization/:id', authMiddleware, (req, res) => {
  try {
    const data = readData('authorization.json');
    if (data === null) {
      return errorResponse(res, 500, '读取授权数据失败');
    }

    const id = parseInt(req.params.id);
    const index = data.items.findIndex(i => i.id === id);
    if (index === -1) {
      return errorResponse(res, 404, '授权书不存在');
    }

    const { category, brand, brand_en, image, order } = req.body;
    data.items[index] = {
      ...data.items[index],
      ...(category !== undefined && { category }),
      ...(brand !== undefined && { brand }),
      ...(brand_en !== undefined && { brand_en }),
      ...(image !== undefined && { image }),
      ...(order !== undefined && { order })
    };

    if (!writeData('authorization.json', data)) {
      return errorResponse(res, 500, '保存授权数据失败');
    }

    successResponse(res, data.items[index], '授权书更新成功');
  } catch (err) {
    console.error('更新授权书错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * DELETE /api/authorization/:id - 删除授权书（需认证）
 */
app.delete('/api/authorization/:id', authMiddleware, (req, res) => {
  try {
    const data = readData('authorization.json');
    if (data === null) {
      return errorResponse(res, 500, '读取授权数据失败');
    }

    const id = parseInt(req.params.id);
    const index = data.items.findIndex(i => i.id === id);
    if (index === -1) {
      return errorResponse(res, 404, '授权书不存在');
    }

    data.items.splice(index, 1);

    if (!writeData('authorization.json', data)) {
      return errorResponse(res, 500, '保存授权数据失败');
    }

    successResponse(res, null, '授权书删除成功');
  } catch (err) {
    console.error('删除授权书错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

// ==================== API 路由：企业文化管理 ====================

/**
 * GET /api/culture - 获取企业文化数据
 */
app.get('/api/culture', (req, res) => {
  try {
    const data = readData('culture.json');
    if (data === null) {
      return errorResponse(res, 500, '读取企业文化数据失败');
    }
    successResponse(res, data);
  } catch (err) {
    console.error('获取企业文化错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * POST /api/culture - 新增活动照片（需认证）
 */
app.post('/api/culture', authMiddleware, (req, res) => {
  try {
    const { category, title, image } = req.body;

    if (!category || !title || !image) {
      return errorResponse(res, 400, '分类、标题和图片不能为空');
    }

    const data = readData('culture.json') || { categories: [], items: [] };
    const maxId = data.items.length > 0 ? Math.max(...data.items.map(i => i.id)) : 0;
    const categoryItems = data.items.filter(i => i.category === category);
    const maxOrder = categoryItems.length > 0 ? Math.max(...categoryItems.map(i => i.order)) : 0;

    const newItem = {
      id: maxId + 1,
      category,
      title,
      image,
      order: maxOrder + 1
    };

    data.items.push(newItem);

    if (!writeData('culture.json', data)) {
      return errorResponse(res, 500, '保存文化数据失败');
    }

    successResponse(res, newItem, '活动照片添加成功');
  } catch (err) {
    console.error('添加活动照片错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * DELETE /api/culture/:id - 删除活动照片（需认证）
 */
app.delete('/api/culture/:id', authMiddleware, (req, res) => {
  try {
    const data = readData('culture.json');
    if (data === null) {
      return errorResponse(res, 500, '读取文化数据失败');
    }

    const id = parseInt(req.params.id);
    const index = data.items.findIndex(i => i.id === id);
    if (index === -1) {
      return errorResponse(res, 404, '照片不存在');
    }

    data.items.splice(index, 1);

    if (!writeData('culture.json', data)) {
      return errorResponse(res, 500, '保存文化数据失败');
    }

    successResponse(res, null, '照片删除成功');
  } catch (err) {
    console.error('删除照片错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

// ==================== API 路由：客户Logo管理 ====================

/**
 * GET /api/clients - 获取客户列表
 */
app.get('/api/clients', (req, res) => {
  try {
    const data = readData('clients.json');
    if (data === null) {
      return errorResponse(res, 500, '读取客户数据失败');
    }
    successResponse(res, data);
  } catch (err) {
    console.error('获取客户列表错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * POST /api/clients - 新增客户（需认证）
 */
app.post('/api/clients', authMiddleware, (req, res) => {
  try {
    const { name, short: shortName, logo } = req.body;

    if (!name) {
      return errorResponse(res, 400, '客户名称不能为空');
    }

    const data = readData('clients.json') || { items: [] };
    const maxId = data.items.length > 0 ? Math.max(...data.items.map(i => i.id)) : 0;
    const maxOrder = data.items.length > 0 ? Math.max(...data.items.map(i => i.order)) : 0;

    const newItem = {
      id: maxId + 1,
      name,
      short: shortName || '',
      logo: logo || '',
      order: maxOrder + 1
    };

    data.items.push(newItem);

    if (!writeData('clients.json', data)) {
      return errorResponse(res, 500, '保存客户数据失败');
    }

    successResponse(res, newItem, '客户添加成功');
  } catch (err) {
    console.error('添加客户错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * PUT /api/clients/:id - 修改客户（需认证）
 */
app.put('/api/clients/:id', authMiddleware, (req, res) => {
  try {
    const data = readData('clients.json');
    if (data === null) {
      return errorResponse(res, 500, '读取客户数据失败');
    }

    const id = parseInt(req.params.id);
    const index = data.items.findIndex(i => i.id === id);
    if (index === -1) {
      return errorResponse(res, 404, '客户不存在');
    }

    const { name, short: shortName, logo, order } = req.body;
    data.items[index] = {
      ...data.items[index],
      ...(name !== undefined && { name }),
      ...(shortName !== undefined && { short: shortName }),
      ...(logo !== undefined && { logo }),
      ...(order !== undefined && { order })
    };

    if (!writeData('clients.json', data)) {
      return errorResponse(res, 500, '保存客户数据失败');
    }

    successResponse(res, data.items[index], '客户更新成功');
  } catch (err) {
    console.error('更新客户错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

/**
 * DELETE /api/clients/:id - 删除客户（需认证）
 */
app.delete('/api/clients/:id', authMiddleware, (req, res) => {
  try {
    const data = readData('clients.json');
    if (data === null) {
      return errorResponse(res, 500, '读取客户数据失败');
    }

    const id = parseInt(req.params.id);
    const index = data.items.findIndex(i => i.id === id);
    if (index === -1) {
      return errorResponse(res, 404, '客户不存在');
    }

    data.items.splice(index, 1);

    if (!writeData('clients.json', data)) {
      return errorResponse(res, 500, '保存客户数据失败');
    }

    successResponse(res, null, '客户删除成功');
  } catch (err) {
    console.error('删除客户错误:', err);
    errorResponse(res, 500, '服务器内部错误');
  }
});

// ==================== API 路由：文件上传 ====================

/**
 * POST /api/upload - 上传图片（需认证）
 */
app.post('/api/upload', authMiddleware, (req, res) => {
  upload.single('file')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return errorResponse(res, 400, '文件大小不能超过 5MB');
      }
      return errorResponse(res, 400, `上传错误: ${err.message}`);
    } else if (err) {
      return errorResponse(res, 400, err.message);
    }

    if (!req.file) {
      return errorResponse(res, 400, '请选择要上传的文件');
    }

    const url = `/uploads/${req.file.filename}`;
    successResponse(res, { url }, '文件上传成功');
  });
});


// 板块可见性
const sectionsConfig = require("./data/sections.json");
app.get("/api/sections", (req, res) => res.json({ success: true, data: sectionsConfig.sections }));

// ==================== 错误处理 ====================

// 404 处理（API 路由）
app.use('/api/*', (req, res) => {
  errorResponse(res, 404, '接口不存在');
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  errorResponse(res, 500, '服务器内部错误');
});

// ==================== 启动服务 ====================

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('  绵阳市荣盛科技有限公司 - 官网管理后台服务');
  console.log('='.repeat(50));
  console.log(`  服务已启动，端口: ${PORT}`);
  console.log(`  主站访问: http://localhost:${PORT}/`);
  console.log(`  后台访问: http://localhost:${PORT}/admin/`);
  console.log(`  API 访问: http://localhost:${PORT}/api/...`);
  console.log('='.repeat(50));
  console.log('  管理员账号: admin');
  console.log('  管理员密码: 123456');
  console.log('='.repeat(50));
});
