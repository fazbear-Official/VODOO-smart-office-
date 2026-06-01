import axios from "axios";
import { createHash } from "crypto";

class GithubDB {
  constructor({ owner, repo, token, encryptionKey = "Online_Storage_Secret", cacheTTL = 300000 } = {}) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
    this.encryptionKey = encryptionKey;
    this.cacheTTL = cacheTTL;
    this.baseRepoUrl = `https://api.github.com/repos/${this.owner}/${this.repo}`;
    this.baseContentsUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/contents`;
    this.headers = {
      Authorization: `token ${this.token}`,
      Accept: "application/vnd.github.v3+json",
    };
    this.cache = new Map();
    this.rateLimit = { remaining: 60, reset: 0 };
  }

  async init() {
    try {
      await axios.get(this.baseRepoUrl, { headers: this.headers });
      console.log("[githubDB] Repo exists");
    } catch (err) {
      await axios.post(
        "https://api.github.com/user/repos",
        {
          name: this.repo,
          private: true,
          auto_init: true,
          description: "Database repository for application data"
        },
        { headers: this.headers }
      );
      console.log("[githubDB] Repo created");
    }
    await this.ensurePath("database");
  }

  async ensurePath(path) {
    try {
      await axios.get(`${this.baseContentsUrl}/${encodeURIComponent(path)}`, { headers: this.headers });
    } catch (err) {
      await this.createFile(`${path}/.init.json`, JSON.stringify({
        init: true,
        createdAt: new Date().toISOString(),
        version: "1.0.0"
      }, null, 2));
    }
  }

  _encrypt(data) {
    if (!this.encryptionKey || this.encryptionKey === "Online_Storage_Secret") {
      return data;
    }
    const cipher = createHash('sha256')
      .update(this.encryptionKey)
      .digest('hex')
      .substring(0, 32);
    const encrypted = Buffer.from(data).toString('base64') + '.' + cipher;
    return encrypted;
  }

  _decrypt(encryptedData) {
    if (!this.encryptionKey || this.encryptionKey === "Online_Storage_Secret") {
      return encryptedData;
    }
    try {
      const parts = encryptedData.split('.');
      if (parts.length !== 2) return encryptedData;
      const cipher = createHash('sha256')
        .update(this.encryptionKey)
        .digest('hex')
        .substring(0, 32);
      if (parts[1] !== cipher) {
        console.warn("Encryption key mismatch, returning encrypted data");
        return encryptedData;
      }
      return Buffer.from(parts[0], 'base64').toString('utf8');
    } catch (error) {
      console.error("Decryption error:", error);
      return encryptedData;
    }
  }

  async _checkRateLimit() {
    const now = Date.now();
    if (this.rateLimit.remaining <= 5 && now < this.rateLimit.reset) {
      const waitTime = this.rateLimit.reset - now;
      console.warn(`Rate limit approaching. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  _updateRateLimit(headers) {
    if (headers['x-ratelimit-remaining']) {
      this.rateLimit.remaining = parseInt(headers['x-ratelimit-remaining']);
      this.rateLimit.reset = parseInt(headers['x-ratelimit-reset']) * 1000;
    }
  }

  async readFile(path, bypassCache = false) {
    const cacheKey = `read:${path}`;
    const now = Date.now();

    if (!bypassCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (now - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    await this._checkRateLimit();

    try {
      const res = await axios.get(`${this.baseContentsUrl}/${encodeURIComponent(path)}`, {
        headers: this.headers
      });
      this._updateRateLimit(res.headers);
      const content = res.data.content;
      const buff = Buffer.from(content, res.data.encoding || "base64");
      const textData = buff.toString("utf8");
      const decryptedData = this._decrypt(textData);
      const data = JSON.parse(decryptedData);
      this.cache.set(cacheKey, { data, timestamp: now });
      return data;
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return null;
      }
      throw err;
    }
  }

  clearCache(path = null) {
    if (path) {
      const cacheKey = `read:${path}`;
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }

  async createFile(path, rawContent, message = `create ${path}`, encrypt = true) {
    await this._checkRateLimit();
    const contentToSave = encrypt ? this._encrypt(rawContent) : rawContent;
    const b64 = Buffer.from(contentToSave).toString("base64");
    const res = await axios.put(
      `${this.baseContentsUrl}/${encodeURIComponent(path)}`,
      {
        message: `${message} - ${new Date().toISOString()}`,
        content: b64
      },
      { headers: this.headers }
    );
    this._updateRateLimit(res.headers);
    this.clearCache(path);
    return res.data;
  }

  async updateFile(path, rawContent, message = `update ${path}`, encrypt = true) {
    await this._checkRateLimit();
    const sha = await this.getSha(path);
    const contentToSave = encrypt ? this._encrypt(rawContent) : rawContent;
    const b64 = Buffer.from(contentToSave).toString("base64");
    const res = await axios.put(
      `${this.baseContentsUrl}/${encodeURIComponent(path)}`,
      {
        message: `${message} - ${new Date().toISOString()}`,
        content: b64,
        sha
      },
      { headers: this.headers }
    );
    this._updateRateLimit(res.headers);
    this.clearCache(path);
    return res.data;
  }

  async getSha(path) {
    await this._checkRateLimit();
    const res = await axios.get(`${this.baseContentsUrl}/${encodeURIComponent(path)}`, {
      headers: this.headers
    });
    this._updateRateLimit(res.headers);
    return res.data.sha;
  }

  async getShaSafe(path) {
    try {
      return await this.getSha(path);
    } catch {
      return null;
    }
  }

  async backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `backups/${timestamp}`;
    await this.ensurePath('backups');
    await this.ensurePath(backupPath);
    try {
      const databaseFiles = await axios.get(`${this.baseContentsUrl}/database`, {
        headers: this.headers
      });
      for (const file of databaseFiles.data) {
        if (file.name.endsWith('.json') && file.name !== '.init.json') {
          const fileContent = await this.readFile(`database/${file.name}`, true);
          await this.createFile(
            `${backupPath}/${file.name}`,
            JSON.stringify(fileContent, null, 2),
            `Backup of ${file.name}`
          );
        }
      }
      console.log(`Backup completed: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error("Backup failed:", error);
      throw error;
    }
  }

  async restore(backupPath) {
    try {
      const backupFiles = await axios.get(`${this.baseContentsUrl}/${backupPath}`, {
        headers: this.headers
      });
      for (const file of backupFiles.data) {
        if (file.name.endsWith('.json')) {
          const fileContent = await axios.get(file.download_url);
          const content = JSON.stringify(fileContent.data, null, 2);
          await this.updateFile(`database/${file.name}`, content, `Restore from backup: ${backupPath}`);
        }
      }
      console.log(`Restore completed from: ${backupPath}`);
      return true;
    } catch (error) {
      console.error("Restore failed:", error);
      throw error;
    }
  }
}

export { GithubDB };
