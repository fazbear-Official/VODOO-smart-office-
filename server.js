import express from "express";
// استيراد GitHub DB APIs
import createSession from "./src/API/GithubDB/createSession.js";
import addData from "./src/API/GithubDB/addData.js";
import updateData from "./src/API/GithubDB/updateData.js";
import deleteData from "./src/API/GithubDB/deleteData.js";
import getData from "./src/API/GithubDB/getData.js";
import updateField from "./src/API/GithubDB/updateField.js";
import deleteField from "./src/API/GithubDB/deleteField.js";

async function setupApp(app, options = {}) {  
  // GitHub DB Routes
  app.post("/api/github/session", createSession);
  app.post("/api/github/add", addData);
  app.put("/api/github/update", updateData);
  app.delete("/api/github/delete", deleteData);
  app.get("/api/github/get", getData);
  app.patch("/api/github/field", updateField);
  app.delete("/api/github/field", deleteField);
  
  }

export default setupApp;
