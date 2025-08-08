import type { Express, Request } from "express";
import type session from "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendVerificationCode } from "./services/emailService";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email().refine(email => email.endsWith('@nextest.com.br'), {
    message: 'Email deve ser do domínio @nextest.com.br'
  }),
  password: z.string().optional(), // If provided, use password login
  loginMethod: z.enum(["password", "code"]).default("code")
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6)
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().refine(email => email.endsWith('@nextest.com.br'), {
    message: 'Email deve ser do domínio @nextest.com.br'
  }),
  department: z.string().min(1),
  password: z.string().min(6).optional(), // Optional password
  confirmPassword: z.string().optional()
}).refine(data => {
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, { message: "Senhas não coincidem", path: ["confirmPassword"] });

const tutorialReleaseSchema = z.object({
  clientName: z.string().min(1),
  clientCpf: z.string().min(11),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  companyName: z.string().min(1),
  companyDocument: z.string().min(14, "CNPJ é obrigatório"),
  companyRole: z.string().min(1),
  tutorialIds: z.array(z.string()).min(1)
});

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, loginMethod } = loginSchema.parse(req.body);
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado. Crie uma conta primeiro." });
      }

      if (loginMethod === "password") {
        // Password login
        if (!password) {
          return res.status(400).json({ message: "Senha é obrigatória para login com senha" });
        }
        
        if (!user.password) {
          return res.status(400).json({ message: "Usuário não possui senha cadastrada. Use o login por código." });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(400).json({ message: "Senha incorreta" });
        }

        // Set session for password login
        req.session = req.session || {};
        (req.session as any).userId = user.id;
        
        res.json({ user, message: "Login realizado com sucesso" });
      } else {
        // Email code login
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await storage.createVerificationCode({
          email,
          code,
          expiresAt
        });

        try {
          await sendVerificationCode(email, code);
          res.json({ message: "Código de verificação enviado" });
        } catch (emailError) {
          console.error('Email sending failed, but code created:', emailError);
          res.json({ 
            message: "Código de verificação gerado. Verifique o console para o código (email não enviado)",
            debugCode: code // For debugging only - remove in production
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Erro no login" });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { email, code } = verifySchema.parse(req.body);
      
      const verificationCode = await storage.getValidVerificationCode(email, code);
      if (!verificationCode) {
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }

      await storage.markVerificationCodeAsUsed(verificationCode.id);
      const user = await storage.getUserByEmail(email);

      // In a real app, you'd set up proper session management here
      req.session = req.session || {};
      (req.session as any).userId = user?.id;

      res.json({ user });
    } catch (error) {
      console.error('Verify error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Erro na verificação" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Usuário já existe" });
      }

      // Hash password if provided
      const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : undefined;

      const user = await storage.createUser({
        name: userData.name,
        email: userData.email,
        department: userData.department,
        password: hashedPassword
      });
      res.json({ user });
    } catch (error) {
      console.error('Register error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Erro no cadastro" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
      });
    }
    res.json({ message: "Logout realizado com sucesso" });
  });

  // Tutorials routes
  app.get("/api/tutorials", async (req, res) => {
    try {
      const tutorials = await storage.getAllTutorials();
      res.json(tutorials);
    } catch (error) {
      console.error('Get tutorials error:', error);
      res.status(500).json({ message: "Erro ao buscar tutoriais" });
    }
  });

  // Tutorial releases routes
  app.post("/api/tutorial-releases", async (req, res) => {
    try {
      if (!(req.session as any)?.userId) {
        return res.status(401).json({ message: "Não autorizado" });
      }

      const releaseData = tutorialReleaseSchema.parse(req.body);
      const release = await storage.createTutorialRelease({
        ...releaseData,
        userId: (req.session as any).userId
      });

      // Send webhook after successful creation
      try {
        await sendTutorialReleaseWebhook(release, releaseData);
      } catch (webhookError) {
        console.error('Webhook sending failed:', webhookError);
        // Continue execution even if webhook fails
      }

      res.json(release);
    } catch (error) {
      console.error('Create release error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Erro ao criar liberação" });
    }
  });

  app.get("/api/tutorial-releases", async (req, res) => {
    try {
      if (!(req.session as any)?.userId) {
        return res.status(401).json({ message: "Não autorizado" });
      }

      const releases = await storage.getAllTutorialReleases();
      res.json(releases);
    } catch (error) {
      console.error('Get releases error:', error);
      res.status(500).json({ message: "Erro ao buscar liberações" });
    }
  });

  // Webhook for external integrations (maintaining original endpoint)
  app.post("/webhook/cadastro", async (req, res) => {
    try {
      // This endpoint can be used by external systems
      const releaseData = tutorialReleaseSchema.parse(req.body);
      
      // For webhook, we'll need to identify the user somehow
      // You might want to add API key validation here
      
      res.json({ message: "Webhook recebido com sucesso", data: releaseData });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Erro no webhook" });
    }
  });

  // Get current user
  // Status tracking API for external confirmations
  app.post("/api/tutorial-releases/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, message } = req.body;
      
      if (!['pending', 'success', 'failed'].includes(status)) {
        return res.status(400).json({ message: "Status inválido. Use: pending, success, failed" });
      }

      await storage.updateTutorialReleaseStatus(id, status);
      
      console.log(`Tutorial release ${id} status updated to: ${status}`, message ? `- ${message}` : '');
      
      res.json({ message: "Status atualizado com sucesso", releaseId: id, status });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Erro ao atualizar status" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Não autorizado" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Webhook function to send tutorial release data
async function sendTutorialReleaseWebhook(release: any, releaseData: any) {
  const webhookUrl = "https://wfapi.automai.com.br/webhook/cadastro/cademi";
  
  // Get tutorial details for the selected tutorials
  const tutorials = await storage.getTutorialsByIds(releaseData.tutorialIds);
  
  // Prepare webhook payload - this is a generic structure, please provide the exact format
  const webhookPayload = {
    id: release.id,
    client: {
      name: releaseData.clientName,
      cpf: releaseData.clientCpf,
      email: releaseData.clientEmail,
      phone: releaseData.clientPhone || null,
      company: {
        name: releaseData.companyName,
        document: releaseData.companyDocument,
        role: releaseData.companyRole
      }
    },
    tutorials: tutorials.map((tutorial: any) => ({
      id: tutorial.id,
      name: tutorial.name,
      description: tutorial.description,
      tag: tutorial.tag,
      idCademi: tutorial.idCademi
    })),
    createdAt: release.createdAt,
    status: "pending"
  };

  console.log('Sending webhook payload:', JSON.stringify(webhookPayload, null, 2));
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookPayload)
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with status: ${response.status}`);
  }

  const responseData = await response.text();
  console.log('Webhook response:', responseData);
  
  return responseData;
}
