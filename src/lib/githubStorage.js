import { GithubDB } from './githubDB.js';

// تخزين مؤقت للتوكنات والريبوهات (مش هنخزنها في قاعدة بيانات عادية)
const sessionStore = new Map();

class GithubStorage {
  // إنشاء جلسة جديدة للمستخدم
  static createSession(userId, { token, repo, username }) {
    const sessionId = Buffer.from(`${userId}_${Date.now()}`).toString('base64');
    sessionStore.set(sessionId, {
      userId,
      token,
      repo,
      username,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 ساعة
    });
    
    // تنظيف الجلسات المنتهية كل ساعة
    setTimeout(() => this.cleanExpiredSessions(), 60 * 60 * 1000);
    
    return sessionId;
  }
  
  // استرجاع بيانات الجلسة
  static getSession(sessionId) {
    const session = sessionStore.get(sessionId);
    if (!session) return null;
    
    if (Date.now() > session.expiresAt) {
      sessionStore.delete(sessionId);
      return null;
    }
    
    return session;
  }
  
  // إنشاء Instance جديد من GitHubDB
  static async getDB(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }
    
    const db = new GithubDB({
      owner: session.username,
      repo: session.repo,
      token: session.token
    });
    
    await db.init();
    return db;
  }
  
  // تنظيف الجلسات المنتهية
  static cleanExpiredSessions() {
    const now = Date.now();
    for (const [key, session] of sessionStore.entries()) {
      if (now > session.expiresAt) {
        sessionStore.delete(key);
      }
    }
  }
  
  // حذف جلسة
  static deleteSession(sessionId) {
    sessionStore.delete(sessionId);
  }
}

export { GithubStorage };
