const pool = require('../config/db');

/**
 * QueryOptimizer Class
 * 
 * Optimizes database queries with:
 * - Prepared statements for all queries
 * - Slow query logging (> 1 second)
 * - Query analysis using EXPLAIN
 * - Query execution time tracking
 * - Index management
 * 
 * Integrates with connection pool from db.js
 */
class QueryOptimizer {
  constructor() {
    this.pool = pool;
    this.slowQueryLog = [];
    this.slowQueryThreshold = 1000; // 1 second in milliseconds
  }

  /**
   * Execute query with prepared statements
   * Tracks execution time and logs slow queries
   * 
   * @param {string} sql - SQL query with placeholders (?)
   * @param {Array} params - Parameters for prepared statement
   * @returns {Promise<Array>} Query results
   */
  async execute(sql, params = []) {
    const startTime = Date.now();
    
    try {
      // Use pool.execute for prepared statements
      const [rows] = await this.pool.execute(sql, params);
      const duration = Date.now() - startTime;
      
      // Log query in development mode
      this.logQuery(sql, duration);
      
      // Log slow queries (> 1 second)
      if (duration > this.slowQueryThreshold) {
        this.logSlowQuery(sql, duration, params);
      }
      
      return rows;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Query Error] ${duration}ms: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Analyze query using EXPLAIN
   * Returns query execution plan for optimization
   * 
   * @param {string} sql - SQL query to analyze
   * @returns {Promise<Array>} EXPLAIN results
   */
  async analyzeQuery(sql) {
    try {
      // Remove trailing semicolon if present
      const cleanSql = sql.trim().replace(/;$/, '');
      const explainSql = `EXPLAIN ${cleanSql}`;
      
      const [rows] = await this.pool.query(explainSql);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Query Analysis]', sql);
        console.table(rows);
      }
      
      return rows;
    } catch (error) {
      console.error('[Query Analysis Error]', error);
      throw error;
    }
  }

  /**
   * Create index on table
   * 
   * @param {string} table - Table name
   * @param {Array<string>} columns - Column names for index
   * @param {string} indexName - Name of the index
   * @returns {Promise<void>}
   */
  async createIndex(table, columns, indexName) {
    try {
      const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
      const sql = `CREATE INDEX ${indexName} ON ${table} (${columnList})`;
      
      await this.pool.query(sql);
      
      console.log(`[Index Created] ${indexName} on ${table}(${columnList})`);
    } catch (error) {
      // Ignore error if index already exists
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log(`[Index Exists] ${indexName} already exists on ${table}`);
      } else {
        console.error('[Index Creation Error]', error);
        throw error;
      }
    }
  }

  /**
   * Drop index from table
   * 
   * @param {string} table - Table name
   * @param {string} indexName - Name of the index to drop
   * @returns {Promise<void>}
   */
  async dropIndex(table, indexName) {
    try {
      const sql = `DROP INDEX ${indexName} ON ${table}`;
      
      await this.pool.query(sql);
      
      console.log(`[Index Dropped] ${indexName} from ${table}`);
    } catch (error) {
      // Ignore error if index doesn't exist
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log(`[Index Not Found] ${indexName} does not exist on ${table}`);
      } else {
        console.error('[Index Drop Error]', error);
        throw error;
      }
    }
  }

  /**
   * List all indexes for a table
   * 
   * @param {string} table - Table name
   * @returns {Promise<Array>} List of indexes
   */
  async listIndexes(table) {
    try {
      const sql = `SHOW INDEXES FROM ${table}`;
      const [rows] = await this.pool.query(sql);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Indexes for ${table}]`);
        console.table(rows);
      }
      
      return rows;
    } catch (error) {
      console.error('[List Indexes Error]', error);
      throw error;
    }
  }

  /**
   * Log slow query (> 1 second)
   * Stores in memory for later analysis
   * 
   * @param {string} sql - SQL query
   * @param {number} duration - Execution time in milliseconds
   * @param {Array} params - Query parameters
   */
  logSlowQuery(sql, duration, params) {
    const logEntry = {
      sql,
      duration,
      params,
      timestamp: new Date().toISOString(),
    };
    
    this.slowQueryLog.push(logEntry);
    
    // Log to console with warning
    console.warn(`[SLOW QUERY] ${duration}ms: ${sql}`);
    if (params && params.length > 0) {
      console.warn(`[SLOW QUERY PARAMS]`, params);
    }
  }

  /**
   * Get all slow queries from log
   * 
   * @returns {Array} Slow query log entries
   */
  getSlowQueries() {
    return this.slowQueryLog;
  }

  /**
   * Clear slow query log
   */
  clearSlowQueryLog() {
    const count = this.slowQueryLog.length;
    this.slowQueryLog = [];
    console.log(`[Slow Query Log] Cleared ${count} entries`);
  }

  /**
   * Log query in development mode
   * 
   * @param {string} sql - SQL query
   * @param {number} duration - Execution time in milliseconds
   */
  logQuery(sql, duration) {
    if (process.env.NODE_ENV === 'development') {
      // Color code based on duration
      const color = duration > 1000 ? '\x1b[31m' : // Red for > 1s
                    duration > 500 ? '\x1b[33m' :  // Yellow for > 500ms
                    '\x1b[32m';                     // Green for < 500ms
      const reset = '\x1b[0m';
      
      console.log(`${color}[QUERY] ${duration}ms${reset}: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
    }
  }

  /**
   * Get slow query statistics
   * 
   * @returns {Object} Statistics about slow queries
   */
  getSlowQueryStats() {
    if (this.slowQueryLog.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
      };
    }

    const durations = this.slowQueryLog.map(entry => entry.duration);
    const sum = durations.reduce((a, b) => a + b, 0);
    
    return {
      count: this.slowQueryLog.length,
      avgDuration: Math.round(sum / durations.length),
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      queries: this.slowQueryLog,
    };
  }

  /**
   * Get slow query report
   * Formatted report of slow queries for monitoring
   * 
   * @returns {string} Formatted report
   */
  getSlowQueryReport() {
    const stats = this.getSlowQueryStats();
    
    if (stats.count === 0) {
      return 'No slow queries recorded.';
    }

    let report = '\n=== SLOW QUERY REPORT ===\n';
    report += `Total Slow Queries: ${stats.count}\n`;
    report += `Average Duration: ${stats.avgDuration}ms\n`;
    report += `Max Duration: ${stats.maxDuration}ms\n`;
    report += `Min Duration: ${stats.minDuration}ms\n`;
    report += '\n--- Query Details ---\n';
    
    this.slowQueryLog.forEach((entry, index) => {
      report += `\n${index + 1}. [${entry.timestamp}] ${entry.duration}ms\n`;
      report += `   SQL: ${entry.sql}\n`;
      if (entry.params && entry.params.length > 0) {
        report += `   Params: ${JSON.stringify(entry.params)}\n`;
      }
    });
    
    return report;
  }
}

// Export singleton instance
module.exports = new QueryOptimizer();
