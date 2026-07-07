import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { Resend } from "resend";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for AI Study Planner
  app.post("/api/study-planner", async (req, res) => {
    try {
      const { selectedClass, selectedSubject } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Generate a personalized, structured 7-day study schedule for a student in ${selectedClass} studying ${selectedSubject}. 
      Include specific topics to cover each day, practical exercises, and review sessions. 
      Format the response in clean Markdown with clear headings and bullet points.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ schedule: response.text });
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate study plan." });
    }
  });

  // API Route for generating Quiz from Notes
  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { noteContent, title } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Based on the following class notes titled "${title}", generate a 5-question multiple choice practice quiz.
      Format the output in clean Markdown. Include an answer key at the very bottom.
      
      Class Notes:
      ${noteContent}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ quiz: response.text });
    } catch (error: any) {
      console.error("Quiz Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate quiz." });
    }
  });

  // API Route for Email Notifications
  app.post("/api/notify", async (req, res) => {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new Error("RESEND_API_KEY environment variable is missing.");
      }

      const resend = new Resend(apiKey);
      const { emails, title, type, content, class: targetClass, subject } = req.body;

      if (!emails || emails.length === 0) {
        return res.json({ success: true, message: "No recipients to notify." });
      }

      let emailSubject = '';
      let emailHtml = '';

      if (type === 'Notice') {
        emailSubject = `📢 New Announcement: ${title}`;
        emailHtml = `
          <h2>New Announcement from Margdarshan Institute</h2>
          <p><strong>${title}</strong></p>
          <p>${content}</p>
        `;
      } else {
        emailSubject = `📚 New Study Material: ${title}`;
        emailHtml = `
          <h2>New Study Material Added</h2>
          <p>A new ${type} has been uploaded for <strong>${targetClass} - ${subject}</strong>.</p>
          <p><strong>Title:</strong> ${title}</p>
          <p>Please log in to the portal to view the materials.</p>
        `;
      }

      // Resend has a limit on the number of recipients per request (e.g. 50).
      // For simplicity, we chunk it into 50.
      const BATCH_SIZE = 50;
      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE);
        await resend.emails.send({
          from: 'Margdarshan Institute <onboarding@resend.dev>',
          to: batch,
          subject: emailSubject,
          html: emailHtml,
        });
      }

      res.json({ success: true, message: "Notifications sent." });
    } catch (error: any) {
      console.error("Email Notification Error:", error);
      res.status(500).json({ error: error.message || "Failed to send notifications." });
    }
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
