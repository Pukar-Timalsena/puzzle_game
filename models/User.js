const db = require("../config/db");
const bcrypt = require("bcrypt");

class User {
  static async create(username, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    const info = stmt.run(username, hashedPassword);
    return { id: Number(info.lastInsertRowid), username };
  }

  static findByUsername(username) {
    const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
    return stmt.get(username);
  }

  static findById(id) {
    const stmt = db.prepare("SELECT id, username, high_score, games_played, created_at FROM users WHERE id = ?");
    return stmt.get(id);
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static updateHighScore(id, score) {
    const stmt = db.prepare(`
      UPDATE users 
      SET high_score = MAX(high_score, ?),
          games_played = COALESCE(games_played, 0) + 1
      WHERE id = ?
    `);
    return stmt.run(score, id);
  }

  static getLeaderboard(limit = 10) {
    const stmt = db.prepare(`
      SELECT username, high_score 
      FROM users 
      ORDER BY high_score DESC 
      LIMIT ?
    `);
    return stmt.all(limit);
  }
}

module.exports = User;
