import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  app.use(express.json());

  // Mock data and state
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(now.getDate() - 2);

  let incidents: any[] = [
    { id: "1", type: "delayed", zone: "Centro", status: "active", timestamp: now.toISOString(), description: "Pedido #442 retrasado 15 min" },
    { id: "2", type: "failed", zone: "Salamanca", status: "active", timestamp: now.toISOString(), description: "Entrega fallida en Calle Serrano" },
    { id: "3", type: "claim", zone: "Chamberí", status: "resolved", timestamp: yesterday.toISOString(), description: "Reclamación por producto dañado" },
    { id: "4", type: "delayed", zone: "Retiro", status: "resolved", timestamp: yesterday.toISOString(), description: "Retraso por evento en el parque" },
    { id: "5", type: "failed", zone: "Arganzuela", status: "resolved", timestamp: twoDaysAgo.toISOString(), description: "Fallo de app en zona sur" },
    { id: "6", type: "refund", zone: "Tetuán", status: "resolved", timestamp: now.toISOString(), description: "Devolución procesada correctamente" },
  ];

  // API Routes
  app.get("/api/incidents", (req, res) => {
    res.json(incidents);
  });

  app.post("/api/incidents", (req, res) => {
    const newIncident = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      status: "active",
      ...req.body,
    };
    incidents.push(newIncident);
    io.emit("new-incident", newIncident);
    res.status(201).json(newIncident);
  });

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log("Client connected");
    socket.emit("initial-incidents", incidents);
    
    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
