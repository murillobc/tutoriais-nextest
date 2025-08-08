// api/index.js - Handler Vercel Serverless
export default async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathname = url.pathname;

    // Health Check
    if (pathname === '/api/health') {
      return res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        database: process.env.DATABASE_URL ? 'configured' : 'not configured',
        email: process.env.SMTP_USER ? 'configured' : 'not configured',
        vercel: 'working',
        path: pathname
      });
    }

    // Login básico (sem banco por enquanto)
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = req.body || {};
      const { email } = body;

      if (!email) {
        return res.status(400).json({ 
          message: 'Email é obrigatório',
          received: body 
        });
      }

      if (!email.endsWith('@nextest.com.br')) {
        return res.status(400).json({ 
          message: 'Email deve ser do domínio @nextest.com.br' 
        });
      }

      // Gerar código mock
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      return res.status(200).json({
        message: 'Código de verificação gerado (mock)',
        debugCode: code,
        email: email,
        note: 'Este é um teste - banco não conectado ainda'
      });
    }

    // Verificação mock
    if (pathname === '/api/auth/verify' && req.method === 'POST') {
      const { email, code } = req.body || {};

      if (!email || !code) {
        return res.status(400).json({ 
          message: 'Email e código são obrigatórios' 
        });
      }

      if (code.length !== 6) {
        return res.status(400).json({ 
          message: 'Código deve ter 6 dígitos' 
        });
      }

      // Mock de usuário
      return res.status(200).json({
        user: {
          id: '1',
          name: 'Usuário Teste',
          email: email,
          department: 'TI'
        },
        message: 'Login realizado (mock)'
      });
    }

    // Rota padrão
    return res.status(404).json({
      message: 'Endpoint não encontrado',
      path: pathname,
      method: req.method,
      available: ['/api/health', '/api/auth/login', '/api/auth/verify']
    });

  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
