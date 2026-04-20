const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Tree = require('./models/Tree');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/** Trang danh sách */
function listLocals(overrides = {}) {
  return {
    title: 'Danh sách cây',
    trees: [],
    ...overrides,
  };
}

/** Form thêm / sửa */
function formPageLocals(overrides = {}) {
  return {
    title: 'Cây',
    error: null,
    formValues: { treename: '', description: '', image: '' },
    ...overrides,
  };
}

async function getAllTrees() {
  return Tree.find().sort({ _id: -1 }).lean();
}

async function getTreeById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Tree.findById(id).lean();
}

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

async function updateTree(id, { treename, description, image }) {
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

  const updated = await Tree.findByIdAndUpdate(
    id,
    { treename: name, description: desc, image: img },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    return {
      ok: false,
      error: 'Không tìm thấy cây hoặc đã bị xóa.',
      values: { treename: name, description: desc, image: img },
    };
  }

  return { ok: true };
}

async function resetAllTrees() {
  await Tree.deleteMany({});
}

async function deleteTreeById(id) {
  if (!mongoose.isValidObjectId(id)) return { ok: false };
  const deleted = await Tree.findByIdAndDelete(id);
  return { ok: !!deleted };
}

function requireTreeId(req, res, next) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).send('Không tìm thấy');
  }
  next();
}

/** Danh sách */
app.get('/', async (req, res) => {
  try {
    const trees = await getAllTrees();
    res.render('index', listLocals({ trees }));
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi server');
  }
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'About me', active: 'about' });
});

/** GET form thêm — khai báo trực tiếp trên app để luôn khớp (tránh Cannot GET khi Router không chạy đúng). */
app.get('/trees/new', (req, res) => {
  res.render('trees/new', formPageLocals({ title: 'Thêm cây', active: 'trees-new' }));
});
app.get('/trees/new/', (req, res) => {
  res.redirect(301, '/trees/new');
});

const handleAddTree = async (req, res) => {
  try {
    const result = await addTree(req.body);
    if (!result.ok) {
      return res.render(
        'trees/new',
        formPageLocals({
          title: 'Thêm cây',
          active: 'trees-new',
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

const handleUpdateTree = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await updateTree(id, req.body);
    if (!result.ok) {
      const tree = await getTreeById(id);
      return res.render('trees/edit', {
        title: 'Sửa cây',
        active: 'trees-edit',
        tree: tree || { _id: id, treename: result.values.treename },
        editAction: `/trees/${id}/edit`,
        error: result.error,
        formValues: result.values,
      });
    }
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Không cập nhật được cây');
  }
};

const handleDeleteTree = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteTreeById(id);
    if (!result.ok) return res.status(404).send('Không tìm thấy cây');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Không xóa được cây');
  }
};

/** POST tạo cây — khai báo trên app (cùng lý do GET /trees/new). */
app.post('/trees', handleAddTree);
app.post('/trees/', handleAddTree);

/** POST xóa một cây — trên app để tránh Cannot POST (Router / mount). */
app.post('/trees/:id/delete', requireTreeId, handleDeleteTree);

/**
 * Route cây còn lại — mount tại /trees (sửa cây).
 * GET /trees/new xử lý ở trên app, không dùng Router để tránh Cannot GET.
 */
const treesRouter = express.Router();

treesRouter.get('/:id/edit', requireTreeId, async (req, res) => {
  try {
    const tree = await getTreeById(req.params.id);
    if (!tree) return res.status(404).send('Không tìm thấy cây');
    res.render('trees/edit', {
      title: 'Sửa cây',
      active: 'trees-edit',
      tree,
      editAction: `/trees/${tree._id}/edit`,
      formValues: {
        treename: tree.treename,
        description: tree.description,
        image: tree.image || '',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Lỗi server');
  }
});

treesRouter.post('/:id/edit', requireTreeId, handleUpdateTree);

app.use('/trees', treesRouter);

app.post('/reset', async (req, res) => {
  try {
    await resetAllTrees();
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Không reset được dữ liệu');
  }
});

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

module.exports = {
  app,
  listLocals,
  /** @deprecated dùng listLocals */
  indexViewLocals: listLocals,
  getAllTrees,
  getTreeById,
  addTree,
  updateTree,
  deleteTreeById,
  resetAllTrees,
};
