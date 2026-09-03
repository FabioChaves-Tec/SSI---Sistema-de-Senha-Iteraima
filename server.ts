import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';

// Portable pure-JSON file database (resolves compiling and GLIBC_2.38 binary issues on system targets)
const dbPath = path.join(process.cwd(), 'ssi_db.json');

interface DbSchema {
  categories: any[];
  users: any[];
  tickets: any[];
  guiches: any[];
  history: any[];
  reports?: any[];
  preferences: Record<string, string>;
}

// Default structures for seeding
const DEFAULT_CATEGORIES = [
  {
    id: 'geral',
    name: 'Atendimento Geral',
    prefix: 'A',
    description: 'Serviços básicos, dúvidas e solicitações gerais de balcão.',
    icon: 'User',
    color: 'emerald',
    bgLight: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    borderCol: 'border-emerald-500',
    textColor: 'text-emerald-600',
    avgDurationMin: 15,
    department: 'Setor de Protocolo',
  },
  {
    id: 'prioritario',
    name: 'Prioritário (Lei nº 10.048)',
    prefix: 'P',
    description: 'Idosos, gestantes, pessoas com deficiência ou autismo.',
    icon: 'Award',
    color: 'amber',
    bgLight: 'bg-amber-50 text-amber-800 border-amber-200',
    borderCol: 'border-amber-500',
    textColor: 'text-amber-600',
    avgDurationMin: 10,
    department: 'Atendimento Preferencial',
  },
  {
    id: 'exclusivo',
    name: 'Serviços Especiais',
    prefix: 'S',
    description: 'Abertura de contas, contratos complexos e consultoria jurídica.',
    icon: 'Briefcase',
    color: 'indigo',
    bgLight: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    borderCol: 'border-indigo-500',
    textColor: 'text-indigo-600',
    avgDurationMin: 25,
    department: 'Diretoria de Habitação e Terras',
  },
  {
    id: 'rapido',
    name: 'Retiradas e Rápido',
    prefix: 'R',
    description: 'Apenas retirada de senhas, cartões, e assinaturas express.',
    icon: 'Zap',
    color: 'sky',
    bgLight: 'bg-sky-50 text-sky-800 border-sky-105',
    borderCol: 'border-sky-500',
    textColor: 'text-sky-600',
    avgDurationMin: 4,
    department: 'Entrega Rápida de Títulos',
  },
];

const INITIAL_USERS = [
  {
    id: 'user_ssi',
    name: 'ssi_user',
    email: 'ssi_user',
    role: 'supervisor',
    password: '220319',
    guicheNumber: undefined,
  },
  {
    id: 'user_fabio',
    name: 'Fábio Chaves',
    email: 'fabio.freitas.chaves@gmail.com',
    role: 'attendant',
    password: '123',
    guicheNumber: 1,
  },
  {
    id: 'user_admin',
    name: 'Fábio Freitas',
    email: 'admin@iteraima.rr.gov.br',
    role: 'supervisor',
    password: 'admin',
    guicheNumber: undefined,
  }
];

const INITIAL_GUICHES = [
  {
    id: 'guiche_1',
    number: 1,
    attendantName: 'Fábio Chaves',
    currentTicketId: null,
    status: 'offline',
    categoryFocus: ['geral', 'prioritario', 'rapido'],
    isCallingAnimation: 0,
  },
  {
    id: 'guiche_2',
    number: 2,
    attendantName: null,
    currentTicketId: null,
    status: 'offline',
    categoryFocus: ['geral', 'prioritario', 'exclusivo'],
    isCallingAnimation: 0,
  },
  {
    id: 'guiche_3',
    number: 3,
    attendantName: null,
    currentTicketId: null,
    status: 'offline',
    categoryFocus: ['rapido', 'geral'],
    isCallingAnimation: 0,
  },
  {
    id: 'guiche_4',
    number: 4,
    attendantName: null,
    currentTicketId: null,
    status: 'offline',
    categoryFocus: ['prioritario', 'exclusivo'],
    isCallingAnimation: 0,
  },
];

const generateInitialHistory = () => {
  const now = Date.now();
  return [
    {
      id: `h_gen_${now}_1`,
      code: 'P-001',
      categoryName: 'Prioritário',
      categoryPrefix: 'P',
      waitTimeSec: 120,
      serviceTimeSec: 360,
      status: 'completed',
      guicheNumber: 1,
      attendantName: 'Fábio Chaves',
      timestamp: now - 50 * 60 * 1000,
      rating: 5,
    },
    {
      id: `h_gen_${now}_2`,
      code: 'A-010',
      categoryName: 'Atendimento Geral',
      categoryPrefix: 'A',
      waitTimeSec: 680,
      serviceTimeSec: 840,
      status: 'completed',
      guicheNumber: 2,
      attendantName: 'Atendente Administrativo',
      timestamp: now - 40 * 60 * 1000,
      rating: 4,
    },
    {
      id: `h_gen_${now}_3`,
      code: 'R-027',
      categoryName: 'Retiradas e Rápido',
      categoryPrefix: 'R',
      waitTimeSec: 90,
      serviceTimeSec: 150,
      status: 'completed',
      guicheNumber: 3,
      attendantName: 'Atendente Administrativo',
      timestamp: now - 32 * 60 * 1000,
      rating: 5,
    },
    {
      id: `h_gen_${now}_4`,
      code: 'S-001',
      categoryName: 'Serviços Especiais',
      categoryPrefix: 'S',
      waitTimeSec: 1420,
      serviceTimeSec: 1680,
      status: 'completed',
      guicheNumber: 4,
      attendantName: 'Atendente Administrativo',
      timestamp: now - 25 * 60 * 1000,
      rating: 3,
    },
    {
      id: `h_gen_${now}_5`,
      code: 'A-011',
      categoryName: 'Atendimento Geral',
      categoryPrefix: 'A',
      waitTimeSec: 810,
      serviceTimeSec: 720,
      status: 'completed',
      guicheNumber: 1,
      attendantName: 'Fábio Chaves',
      timestamp: now - 18 * 60 * 1000,
      rating: 5,
    },
    {
      id: `h_gen_${now}_6`,
      code: 'P-002',
      categoryName: 'Prioritário',
      categoryPrefix: 'P',
      waitTimeSec: 180,
      serviceTimeSec: 420,
      status: 'completed',
      guicheNumber: 2,
      attendantName: 'Atendente Administrativo',
      timestamp: now - 10 * 60 * 1000,
      rating: 4,
    },
    {
      id: `h_gen_${now}_7`,
      code: 'R-028',
      categoryName: 'Retiradas e Rápido',
      categoryPrefix: 'R',
      waitTimeSec: 110,
      serviceTimeSec: 130,
      status: 'no_show',
      guicheNumber: 1,
      attendantName: 'Fábio Chaves',
      timestamp: now - 5 * 60 * 1000,
      rating: null,
    }
  ];
};

const INITIAL_TICKETS = () => {
  const now = Date.now();
  return [
    {
      id: 't_1',
      number: 14,
      code: 'A-014',
      categoryId: 'geral',
      createdAt: now - 18 * 60 * 1000,
      status: 'waiting',
    },
    {
      id: 't_2',
      number: 5,
      code: 'P-005',
      categoryId: 'prioritario',
      createdAt: now - 3 * 60 * 1000,
      status: 'waiting',
    },
    {
      id: 't_3',
      number: 3,
      code: 'S-003',
      categoryId: 'exclusivo',
      createdAt: now - 22 * 60 * 1000,
      status: 'waiting',
    },
    {
      id: 't_4',
      number: 29,
      code: 'R-029',
      categoryId: 'rapido',
      createdAt: now - 1 * 60 * 1000,
      status: 'waiting',
    },
    {
      id: 't_5',
      number: 15,
      code: 'A-015',
      categoryId: 'geral',
      createdAt: now - 12 * 60 * 1000,
      status: 'waiting',
    }
  ];
};

let memoryDb: DbSchema | null = null;
let savePromise: Promise<void> = Promise.resolve();

// Sequence-locked writer helper
async function writeDbFile(db: DbSchema) {
  const executeWrite = async () => {
    const tempPath = `${dbPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(db, null, 2), 'utf-8');
    await fs.rename(tempPath, dbPath);
  };
  savePromise = savePromise.then(executeWrite).catch(err => {
    console.error('[DATABASE] Failed writing to persistent ssi_db.json file:', err);
  });
  return savePromise;
}

async function initDatabase(): Promise<DbSchema> {
  if (memoryDb) return memoryDb;
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    memoryDb = JSON.parse(data);
    
    // Always guarantee that user_ssi is verified with exact specifications
    if (memoryDb) {
      if (!Array.isArray(memoryDb.reports)) {
        memoryDb.reports = [];
      }
      const ssiIndex = memoryDb.users.findIndex(u => u.id === 'user_ssi' || u.name === 'ssi_user');
      const ssiUser = {
        id: 'user_ssi',
        name: 'ssi_user',
        email: 'ssi_user',
        role: 'supervisor',
        password: '220319',
        guicheNumber: undefined,
      };

      if (ssiIndex >= 0) {
        memoryDb.users[ssiIndex] = ssiUser;
      } else {
        memoryDb.users.unshift(ssiUser);
      }
      await writeDbFile(memoryDb);
      console.log('[DATABASE] ssi_db.json persistent database loaded successfully.');
    }
  } catch (err) {
    console.error('[DATABASE] Error reading or parsing ssi_db.json database:', err);
    console.log('[DATABASE] Creating new persistent pure-JS store ssi_db.json with default seeds...');
    memoryDb = {
      categories: DEFAULT_CATEGORIES,
      users: INITIAL_USERS,
      guiches: INITIAL_GUICHES,
      history: generateInitialHistory(),
      tickets: INITIAL_TICKETS(),
      reports: [],
      preferences: {
        'sga_neo_muted': 'false',
        'sga_neo_vocalize': 'true',
        'sga_neo_current_user': ''
      }
    };
    await writeDbFile(memoryDb);
  }
  return memoryDb!;
}

async function startServer() {
  await initDatabase();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  
  // 1. Fetch entire system state (categories, users, tickets, guiches, history, preferences)
  app.get('/api/state', async (req, res) => {
    try {
      if (!memoryDb) {
        await initDatabase();
      }

      // Format objects matching frontend schema expectations
      const catMap = new Map();
      const categoriesList = memoryDb!.categories.map(cat => {
        const item = {
          id: cat.id,
          name: cat.name,
          prefix: cat.prefix,
          description: cat.description || '',
          icon: cat.icon || 'User',
          color: cat.color || 'blue',
          bgLight: cat.bgLight || 'bg-slate-50',
          borderCol: cat.borderCol || 'border-slate-505',
          textColor: cat.textColor || 'text-slate-600',
          avgDurationMin: cat.avgDurationMin || 10,
          department: cat.department || undefined
        };
        catMap.set(cat.id, item);
        return item;
      });

      const usersList = memoryDb!.users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        password: u.password,
        guicheNumber: u.guicheNumber || undefined,
        isApproved: u.isApproved !== false
      }));

      const ticketsList = memoryDb!.tickets.map(t => ({
        id: t.id,
        number: t.number,
        code: t.code,
        category: catMap.get(t.categoryId) || { id: t.categoryId, name: t.categoryId, prefix: t.code[0], icon: 'User', color: 'slate', bgLight: 'bg-slate-50', borderCol: 'border-slate-505', textColor: 'text-slate-600', avgDurationMin: 10 },
        createdAt: t.createdAt,
        calledAt: t.calledAt || undefined,
        servingStartedAt: t.servingStartedAt || undefined,
        completedAt: t.completedAt || undefined,
        guicheNumber: t.guicheNumber || undefined,
        attendantName: t.attendantName || undefined,
        status: t.status
      }));

      const guichesList = memoryDb!.guiches.map(g => {
        const ticketId = g.currentTicketId;
        const currentTicket = ticketId ? ticketsList.find(t => t.id === ticketId) || null : null;
        return {
          id: g.id,
          number: g.number,
          attendantName: g.attendantName || undefined,
          currentTicket,
          status: g.status,
          categoryFocus: Array.isArray(g.categoryFocus) ? g.categoryFocus : JSON.parse(g.categoryFocus || '[]'),
          isCallingAnimation: !!g.isCallingAnimation
        };
      });

      const historyList = memoryDb!.history.map(h => ({
        id: h.id,
        code: h.code,
        categoryName: h.categoryName,
        categoryPrefix: h.categoryPrefix,
        waitTimeSec: h.waitTimeSec,
        serviceTimeSec: h.serviceTimeSec,
        status: h.status,
        guicheNumber: h.guicheNumber,
        attendantName: h.attendantName,
        timestamp: h.timestamp,
        rating: h.rating !== null && h.rating !== undefined ? h.rating : undefined
      }));

      res.json({
        categories: categoriesList,
        users: usersList,
        tickets: ticketsList,
        guiches: guichesList,
        history: historyList,
        reports: memoryDb!.reports || [],
        prefs: memoryDb!.preferences
      });
    } catch (err: any) {
      console.error('Failed to resolve /api/state', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Save active tickets collection
  app.post('/api/tickets', async (req, res) => {
    try {
      const { tickets } = req.body;
      if (!Array.isArray(tickets)) {
        return res.status(400).json({ error: 'Tickets must be an array' });
      }

      const formatted = tickets.map(t => ({
        id: t.id,
        number: t.number,
        code: t.code,
        categoryId: t.category?.id || t.categoryId,
        createdAt: t.createdAt,
        calledAt: t.calledAt || null,
        servingStartedAt: t.servingStartedAt || null,
        completedAt: t.completedAt || null,
        guicheNumber: t.guicheNumber || null,
        attendantName: t.attendantName || null,
        status: t.status
      }));

      if (!memoryDb) await initDatabase();
      memoryDb!.tickets = formatted;
      await writeDbFile(memoryDb!);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error in POST /api/tickets', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Save active guiches collection
  app.post('/api/guiches', async (req, res) => {
    try {
      const { guiches } = req.body;
      if (!Array.isArray(guiches)) {
        return res.status(400).json({ error: 'Guiches must be an array' });
      }

      const formatted = guiches.map(g => ({
        id: g.id,
        number: g.number,
        attendantName: g.attendantName || null,
        currentTicketId: g.currentTicket?.id || null,
        status: g.status,
        categoryFocus: Array.isArray(g.categoryFocus) ? g.categoryFocus : JSON.parse(g.categoryFocus || '[]'),
        isCallingAnimation: g.isCallingAnimation ? 1 : 0
      }));

      if (!memoryDb) await initDatabase();
      memoryDb!.guiches = formatted;
      await writeDbFile(memoryDb!);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error in POST /api/guiches', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Save history/audit logs
  app.post('/api/history', async (req, res) => {
    try {
      const { history } = req.body;
      if (!Array.isArray(history)) {
        return res.status(400).json({ error: 'History must be an array' });
      }

      if (!memoryDb) await initDatabase();
      memoryDb!.history = history;
      await writeDbFile(memoryDb!);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error in POST /api/history', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Save service categories list
  app.post('/api/categories', async (req, res) => {
    try {
      const { categories } = req.body;
      if (!Array.isArray(categories)) {
        return res.status(400).json({ error: 'Categories must be an array' });
      }

      if (!memoryDb) await initDatabase();
      memoryDb!.categories = categories;
      await writeDbFile(memoryDb!);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error in POST /api/categories', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Save users list
  app.post('/api/users', async (req, res) => {
    try {
      const { users } = req.body;
      if (!Array.isArray(users)) {
        return res.status(400).json({ error: 'Users must be an array' });
      }

      if (!memoryDb) await initDatabase();
      memoryDb!.users = users;
      await writeDbFile(memoryDb!);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error in POST /api/users', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Save arbitrary preferences
  app.post('/api/preferences', async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: 'Key is required' });
      }

      if (!memoryDb) await initDatabase();
      memoryDb!.preferences[key] = String(value);
      await writeDbFile(memoryDb!);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error in POST /api/preferences', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Reports registration & retrieval
  app.get('/api/reports', async (req, res) => {
    try {
      if (!memoryDb) await initDatabase();
      res.json({ reports: memoryDb!.reports || [] });
    } catch (err: any) {
      console.error('Error in GET /api/reports', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/reports', async (req, res) => {
    try {
      const { report, reports } = req.body;
      if (!memoryDb) await initDatabase();
      if (!Array.isArray(memoryDb!.reports)) memoryDb!.reports = [];

      if (report && typeof report === 'object') {
        // Prepend new report or update existing
        memoryDb!.reports = [report, ...memoryDb!.reports.filter(r => r.id !== report.id)];
      } else if (Array.isArray(reports)) {
        memoryDb!.reports = reports;
      } else {
        return res.status(400).json({ error: 'Report object or reports array is required' });
      }

      await writeDbFile(memoryDb!);
      console.log(`[REPORTS] Report registered into database. Total recorded: ${memoryDb!.reports.length}`);
      res.json({ success: true, reports: memoryDb!.reports });
    } catch (err: any) {
      console.error('Error in POST /api/reports', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/reports/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!memoryDb) await initDatabase();
      if (Array.isArray(memoryDb!.reports)) {
        memoryDb!.reports = memoryDb!.reports.filter(r => r.id !== id);
        await writeDbFile(memoryDb!);
      }
      res.json({ success: true, reports: memoryDb!.reports || [] });
    } catch (err: any) {
      console.error('Error in DELETE /api/reports/:id', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Integration for dev vs production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULLSTACK SERVER] Pure JavaScript database mode live and bound to http://0.0.0.0:${PORT}`);
    console.log(`[DATABASE] Integrated JSON active at: ${dbPath}`);
  });
}

startServer();
