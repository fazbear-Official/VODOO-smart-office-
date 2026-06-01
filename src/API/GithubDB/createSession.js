import { GithubStorage } from "../../lib/githubStorage.js";
import { GithubDB } from "../../lib/githubDB.js";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { token, repo, username, userId } = req.body;
    
    if (!token || !repo || !username) {
      return res.status(400).json({
        success: false,
        error: 'token, repo and username are required'
      });
    }
    
    // التحقق من صحة التوكن والريبو
    const testDB = new GithubDB({
      owner: username,
      repo: repo,
      token: token
    });
    
    try {
      await testDB.init();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid GitHub credentials'
      });
    }
    
    // إنشاء جلسة جديدة
    const sessionId = GithubStorage.createSession(userId || 'anonymous', {
      token,
      repo,
      username
    });
    
    res.json({
      success: true,
      sessionId: sessionId,
      expiresIn: 86400, // 24 ساعة بالثواني
      message: 'Session created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
