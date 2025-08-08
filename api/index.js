// api/index.js - Handler principal para Vercel
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, gt, desc, inArray } from 'drizzle-orm';
import nodemailer from 'nodemailer';

// Configure WebSocket para Neon no ambiente serverless
if (typeof WebSocket === 'undefined') {
  global.WebSocket = require('ws');
}
neonConfig.webSocketConstructor = global.WebSocket;

// Configurar banco
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1 // Apenas 1 conexão para serverless
});

// Schema simplificado (você pode importar do seu arquivo)
import { sql } from 'drizzle-orm';
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  department: text("department").notNull(),
  password: text("password"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

const db = drizzle({ client: pool, schema: { users, verificationCodes } });

// Configurar email
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

let transporter;
if (emailConfig.auth.user && emailConfig.auth.pass) {
  transporter = nodemailer.createTransporter(emailConfig);
}

// Função para gerar código
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Função para enviar email
async function sendVerificationCode(email, code) {
  if (!transporter) {
    console.log(`Email não configurado. Código para ${email}: ${code}`);
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'Portal Nextest <noreply@nextest.com.br>',
    to: email,
    subject: 'Código de Verificação - Portal Nextest',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Portal de Tutoriais Nextest</h1>
        <p>Seu código de verificação é:</p>
        <div style="font-size: 32px; font-weight: bold; color: #0075C5; text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">${code}</div>
        <p>Este código expira em 10 minutos.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// Criar app Express
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session (simplificada para serverless)
app.use(session({
  secret: process.env.SESSION_SECRET || 'nextest-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Rotas da API
app.get('/api/health', async (req, res) => {
  try {
    await db.execute('SELECT 1');
    res.json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'connected',
      email: process.env.SMTP_USER ? 'configured' : 'not configured'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR',
      error: error.message,
      database: 'disconnected'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.endsWith('@nextest.com.br')) {
      return res.status(400).json({ message: 'Email deve ser do domínio @nextest.com.br' });
    }

    // Verificar se usuário existe
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado. Crie uma conta primeiro.' });
    }

    // Gerar código
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Salvar código
    await db.insert(verificationCodes).values({
      email,
      code,
      expiresAt
    });

    // Enviar email
    try {
      await sendVerificationCode(email, code);
      res.json({ message: 'Código de verificação enviado' });
    } catch (emailError) {
      console.error('Email error:', emailError);
      res.json({ 
        message: 'Código gerado (email não enviado)',
        debugCode: code // Remover em produção
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    const { email, code } = req.body;

    const [verificationCode] = await db.select().from(verificationCodes).where(
      and(
        eq(verificationCodes.email, email),
        eq(verificationCodes.code, code),
        eq(verificationCodes.used, false),
        gt(verificationCodes.expiresAt, new Date())
      )
    );

    if (!verificationCode) {
      return res.status(400).json({ message: 'Código inválido ou expirado' });
    }

    // Marcar como usado
    await db.update(verificationCodes)
      .set({ used: true })
      .where(eq(verificationCodes.id, verificationCode.id));

    // Buscar usuário
    const [user] = await db.select().from(users).where(eq(users.email, email));

    req.session.userId = user?.id;
    res.json({ user });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Erro ao buscar usuário' });
  }
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

// Export para Vercel
export default app;
