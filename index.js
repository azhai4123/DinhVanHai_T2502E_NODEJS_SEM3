const path = require('path');
const express = require('express');
const connectDB = require('./config/db');
const Tree = require('./models/Tree');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/** Biến mặc định cho view index — tránh thiếu khi gọi render từ file khác */
function indexViewLocals(overrides = {}) {
  return {
    title: 'TreeShop',
    trees: [],
    error: null,
    formValues: { treename: '', description: '', image: '' },
    ...overrides,
  };
}

/** Lấy toàn bộ cây trong DB */
async function getAllTrees() {
  return Tree.find().sort({ _id: -1 }).lean();
}

/** Thêm cây — validate treename & description bắt buộc */
async function addTree({ treename, description, image }) {
  const name = typeof treename === 'string' ? treename.trim() : '';
  const desc = typeof description === 'string' ? description.trim() : '';
  const img = typeof image === 'string' ? image.trim() : '';

  if (!name || !desc) {
    return {
      ok: false,
      error: 'Tên cây và mô tả là bắt buộc.',
      values: { treename: treename || '', description: description || '', image: img },
    };
  }

  await Tree.create({
    treename: name,
    description: desc,
    image: img,
  });

  return { ok: true };
}

/** Xóa hết document trong TreeCollection */
async function resetAllTrees() {
  await Tree.deleteMany({});
}

app.get('/', async (req, res) => {
  try {
    const trees = await getAllTrees();
    res.render('index', indexViewLocals({ trees }));
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi server');
  }
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'About me' });
});

/** Thêm cây: POST / (cùng URL trang chủ — tránh lỗi Cannot POST khi proxy/extension xử lý sai /trees) */
const handleAddTree = async (req, res) => {
  try {
    const result = await addTree(req.body);
    if (!result.ok) {
      const trees = await getAllTrees();
      return res.render(
        'index',
        indexViewLocals({
          trees,
          error: result.error,
          formValues: result.values,
        })
      );
    }
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Không thêm được cây');
  }
};

app.post('/', handleAddTree);
app.post('/trees', handleAddTree);
app.post('/trees/', handleAddTree);

app.post('/reset', async (req, res) => {
  try {
    await resetAllTrees();
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Không reset được dữ liệu');
  }
});

/* File tĩnh đặt sau route — tránh xung đột với POST/GET ứng dụng */
app.use(express.static(path.join(__dirname, 'public')));

async function start() {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`Server: http://localhost:${PORT}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nLỗi: cổng ${PORT} đang bị chiếm (server Node cũ hoặc app khác).`);
      console.error('Cách xử lý:');
      console.error(`  1) Tắt terminal đang chạy node trước đó, hoặc`);
      console.error(`  2) Windows CMD:  netstat -ano | findstr :${PORT}   → lấy PID cuối dòng →  taskkill /PID <PID> /F`);
      console.error(`  3) Đổi cổng:  set PORT=3001 && node index.js\n`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

start();

module.exports = { app, indexViewLocals, getAllTrees, addTree, resetAllTrees };
