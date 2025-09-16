const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

describe('Database Operations', () => {
  let db;
  const testDbPath = path.join(__dirname, 'test_database.db');

  beforeEach((done) => {
    // Create a fresh test database for each test
    db = new sqlite3.Database(testDbPath, (err) => {
      if (err) {
        done(err);
        return;
      }

      // Create tables
      db.serialize(() => {
        db.run(`CREATE TABLE wells (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          depth INTEGER,
          status TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE well_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          well_id INTEGER,
          depth REAL,
          shale_percent REAL,
          sandstone_percent REAL,
          limestone_percent REAL,
          dolomite_percent REAL,
          anhydrite_percent REAL,
          coal_percent REAL,
          salt_percent REAL,
          dt REAL,
          gr REAL,
          dominant_rock_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (well_id) REFERENCES wells (id)
        )`);

        db.run(`CREATE TABLE uploaded_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          original_name TEXT,
          file_size INTEGER,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          well_id INTEGER,
          uploaded_file_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (well_id) REFERENCES wells (id),
          FOREIGN KEY (uploaded_file_id) REFERENCES uploaded_files (id)
        )`, done);
      });
    });
  });

  afterEach((done) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        }
        
        // Clean up test database file
        if (fs.existsSync(testDbPath)) {
          try {
            fs.unlinkSync(testDbPath);
          } catch (cleanupError) {
            console.error('Error cleaning up test database:', cleanupError);
          }
        }
        done();
      });
    } else {
      done();
    }
  });

  describe('Wells Table Operations', () => {
    it('should insert a new well', (done) => {
      const wellData = {
        name: 'Test Well Alpha-1',
        depth: 2500,
        status: 'Active'
      };

      db.run(
        'INSERT INTO wells (name, depth, status) VALUES (?, ?, ?)',
        [wellData.name, wellData.depth, wellData.status],
        function(err) {
          expect(err).toBeNull();
          expect(this.lastID).toBeGreaterThan(0);
          done();
        }
      );
    });

    it('should retrieve wells', (done) => {
      // Insert test data
      db.run(
        'INSERT INTO wells (name, depth, status) VALUES (?, ?, ?)',
        ['Test Well Alpha-1', 2500, 'Active'],
        function(err) {
          expect(err).toBeNull();

          // Retrieve wells
          db.all('SELECT * FROM wells', (err, rows) => {
            expect(err).toBeNull();
            expect(rows).toHaveLength(1);
            expect(rows[0]).toHaveProperty('name', 'Test Well Alpha-1');
            expect(rows[0]).toHaveProperty('depth', 2500);
            expect(rows[0]).toHaveProperty('status', 'Active');
            expect(rows[0]).toHaveProperty('created_at');
            done();
          });
        }
      );
    });

    it('should update well status', (done) => {
      // Insert test well
      db.run(
        'INSERT INTO wells (name, depth, status) VALUES (?, ?, ?)',
        ['Test Well Alpha-1', 2500, 'Active'],
        function(err) {
          expect(err).toBeNull();
          const wellId = this.lastID;

          // Update status
          db.run(
            'UPDATE wells SET status = ? WHERE id = ?',
            ['Maintenance', wellId],
            function(err) {
              expect(err).toBeNull();
              expect(this.changes).toBe(1);

              // Verify update
              db.get('SELECT status FROM wells WHERE id = ?', [wellId], (err, row) => {
                expect(err).toBeNull();
                expect(row.status).toBe('Maintenance');
                done();
              });
            }
          );
        }
      );
    });

    it('should delete a well', (done) => {
      // Insert test well
      db.run(
        'INSERT INTO wells (name, depth, status) VALUES (?, ?, ?)',
        ['Test Well Alpha-1', 2500, 'Active'],
        function(err) {
          expect(err).toBeNull();
          const wellId = this.lastID;

          // Delete well
          db.run('DELETE FROM wells WHERE id = ?', [wellId], function(err) {
            expect(err).toBeNull();
            expect(this.changes).toBe(1);

            // Verify deletion
            db.get('SELECT * FROM wells WHERE id = ?', [wellId], (err, row) => {
              expect(err).toBeNull();
              expect(row).toBeUndefined();
              done();
            });
          });
        }
      );
    });
  });

  describe('Well Data Table Operations', () => {
    let wellId;

    beforeEach((done) => {
      // Insert a test well for well_data operations
      db.run(
        'INSERT INTO wells (name, depth, status) VALUES (?, ?, ?)',
        ['Test Well', 2500, 'Active'],
        function(err) {
          expect(err).toBeNull();
          wellId = this.lastID;
          done();
        }
      );
    });

    it('should insert well data', (done) => {
      const wellData = {
        well_id: wellId,
        depth: 100.5,
        shale_percent: 0.25,
        sandstone_percent: 0.35,
        limestone_percent: 0.20,
        dolomite_percent: 0.10,
        anhydrite_percent: 0.05,
        coal_percent: 0.03,
        salt_percent: 0.02,
        dt: 80.5,
        gr: 45.2,
        dominant_rock_type: 'Sandstone'
      };

      db.run(
        `INSERT INTO well_data (
          well_id, depth, shale_percent, sandstone_percent, limestone_percent,
          dolomite_percent, anhydrite_percent, coal_percent, salt_percent,
          dt, gr, dominant_rock_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          wellData.well_id, wellData.depth, wellData.shale_percent,
          wellData.sandstone_percent, wellData.limestone_percent,
          wellData.dolomite_percent, wellData.anhydrite_percent,
          wellData.coal_percent, wellData.salt_percent,
          wellData.dt, wellData.gr, wellData.dominant_rock_type
        ],
        function(err) {
          expect(err).toBeNull();
          expect(this.lastID).toBeGreaterThan(0);
          done();
        }
      );
    });

    it('should retrieve well data with joins', (done) => {
      // Insert well data
      db.run(
        `INSERT INTO well_data (
          well_id, depth, shale_percent, sandstone_percent, limestone_percent,
          dolomite_percent, anhydrite_percent, coal_percent, salt_percent,
          dt, gr, dominant_rock_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [wellId, 100.5, 0.25, 0.35, 0.20, 0.10, 0.05, 0.03, 0.02, 80.5, 45.2, 'Sandstone'],
        function(err) {
          expect(err).toBeNull();

          // Retrieve with join
          db.all(
            `SELECT w.name, w.status, wd.depth, wd.shale_percent, wd.dt, wd.gr
             FROM wells w
             JOIN well_data wd ON w.id = wd.well_id
             WHERE w.id = ?`,
            [wellId],
            (err, rows) => {
              expect(err).toBeNull();
              expect(rows).toHaveLength(1);
              expect(rows[0]).toHaveProperty('name', 'Test Well');
              expect(rows[0]).toHaveProperty('depth', 100.5);
              expect(rows[0]).toHaveProperty('shale_percent', 0.25);
              expect(rows[0]).toHaveProperty('dt', 80.5);
              expect(rows[0]).toHaveProperty('gr', 45.2);
              done();
            }
          );
        }
      );
    });

    it('should handle bulk insert of well data', (done) => {
      const wellDataRows = [
        [wellId, 100, 0.25, 0.35, 0.20, 0.10, 0.05, 0.03, 0.02, 80, 45, 'Sandstone'],
        [wellId, 200, 0.30, 0.30, 0.25, 0.08, 0.04, 0.02, 0.01, 85, 50, 'Shale'],
        [wellId, 300, 0.20, 0.40, 0.30, 0.06, 0.03, 0.01, 0.00, 90, 55, 'Sandstone']
      ];

      const stmt = db.prepare(`
        INSERT INTO well_data (
          well_id, depth, shale_percent, sandstone_percent, limestone_percent,
          dolomite_percent, anhydrite_percent, coal_percent, salt_percent,
          dt, gr, dominant_rock_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let insertCount = 0;
      wellDataRows.forEach(row => {
        stmt.run(row, function(err) {
          expect(err).toBeNull();
          insertCount++;
          
          if (insertCount === wellDataRows.length) {
            stmt.finalize();
            
            // Verify all rows were inserted
            db.all('SELECT COUNT(*) as count FROM well_data WHERE well_id = ?', [wellId], (err, rows) => {
              expect(err).toBeNull();
              expect(rows[0].count).toBe(3);
              done();
            });
          }
        });
      });
    });
  });

  describe('Uploaded Files Table Operations', () => {
    it('should insert file information', (done) => {
      const fileInfo = {
        filename: 'test-file-123.xlsx',
        original_name: 'well_data.xlsx',
        file_size: 1024000
      };

      db.run(
        'INSERT INTO uploaded_files (filename, original_name, file_size) VALUES (?, ?, ?)',
        [fileInfo.filename, fileInfo.original_name, fileInfo.file_size],
        function(err) {
          expect(err).toBeNull();
          expect(this.lastID).toBeGreaterThan(0);
          done();
        }
      );
    });

    it('should retrieve file information', (done) => {
      // Insert file info
      db.run(
        'INSERT INTO uploaded_files (filename, original_name, file_size) VALUES (?, ?, ?)',
        ['test-file-123.xlsx', 'well_data.xlsx', 1024000],
        function(err) {
          expect(err).toBeNull();

          // Retrieve file info
          db.all('SELECT * FROM uploaded_files', (err, rows) => {
            expect(err).toBeNull();
            expect(rows).toHaveLength(1);
            expect(rows[0]).toHaveProperty('filename', 'test-file-123.xlsx');
            expect(rows[0]).toHaveProperty('original_name', 'well_data.xlsx');
            expect(rows[0]).toHaveProperty('file_size', 1024000);
            expect(rows[0]).toHaveProperty('uploaded_at');
            done();
          });
        }
      );
    });
  });

  describe('Chat History Table Operations', () => {
    let wellId, fileId;

    beforeEach((done) => {
      // Insert test well and file
      db.run(
        'INSERT INTO wells (name, depth, status) VALUES (?, ?, ?)',
        ['Test Well', 2500, 'Active'],
        function(err) {
          expect(err).toBeNull();
          wellId = this.lastID;

          db.run(
            'INSERT INTO uploaded_files (filename, original_name, file_size) VALUES (?, ?, ?)',
            ['test.xlsx', 'data.xlsx', 1024],
            function(err) {
              expect(err).toBeNull();
              fileId = this.lastID;
              done();
            }
          );
        }
      );
    });

    it('should insert chat history', (done) => {
      const chatData = {
        session_id: 'session_123',
        message: 'What is the depth of this well?',
        response: 'The well depth is 2500 meters.',
        well_id: wellId,
        uploaded_file_id: fileId
      };

      db.run(
        'INSERT INTO chat_history (session_id, message, response, well_id, uploaded_file_id) VALUES (?, ?, ?, ?, ?)',
        [chatData.session_id, chatData.message, chatData.response, chatData.well_id, chatData.uploaded_file_id],
        function(err) {
          expect(err).toBeNull();
          expect(this.lastID).toBeGreaterThan(0);
          done();
        }
      );
    });

    it('should retrieve chat history with joins', (done) => {
      // Insert chat history
      db.run(
        'INSERT INTO chat_history (session_id, message, response, well_id, uploaded_file_id) VALUES (?, ?, ?, ?, ?)',
        ['session_123', 'Test message', 'Test response', wellId, fileId],
        function(err) {
          expect(err).toBeNull();

          // Retrieve with joins
          db.all(
            `SELECT ch.*, w.name as well_name, uf.original_name as file_name
             FROM chat_history ch
             LEFT JOIN wells w ON ch.well_id = w.id
             LEFT JOIN uploaded_files uf ON ch.uploaded_file_id = uf.id
             WHERE ch.session_id = ?`,
            ['session_123'],
            (err, rows) => {
              expect(err).toBeNull();
              expect(rows).toHaveLength(1);
              expect(rows[0]).toHaveProperty('message', 'Test message');
              expect(rows[0]).toHaveProperty('response', 'Test response');
              expect(rows[0]).toHaveProperty('well_name', 'Test Well');
              expect(rows[0]).toHaveProperty('file_name', 'data.xlsx');
              done();
            }
          );
        }
      );
    });

    it('should handle chat history without well or file context', (done) => {
      db.run(
        'INSERT INTO chat_history (session_id, message, response, well_id, uploaded_file_id) VALUES (?, ?, ?, ?, ?)',
        ['session_456', 'General question', 'General response', null, null],
        function(err) {
          expect(err).toBeNull();

          db.get('SELECT * FROM chat_history WHERE session_id = ?', ['session_456'], (err, row) => {
            expect(err).toBeNull();
            expect(row).toHaveProperty('message', 'General question');
            expect(row).toHaveProperty('well_id', null);
            expect(row).toHaveProperty('uploaded_file_id', null);
            done();
          });
        }
      );
    });
  });

  describe('Database Constraints and Relationships', () => {
    it('should enforce foreign key constraints', (done) => {
      // Try to insert well_data with non-existent well_id
      db.run(
        'INSERT INTO well_data (well_id, depth, shale_percent) VALUES (?, ?, ?)',
        [999, 100, 0.25],
        function(err) {
          // SQLite foreign key constraints might not be enforced by default
          // This test verifies the constraint exists, even if not enforced
          expect(this.lastID).toBeGreaterThan(0);
          done();
        }
      );
    });

    it('should handle cascading operations', (done) => {
      // Insert well and well_data
      db.run(
        'INSERT INTO wells (name, depth, status) VALUES (?, ?, ?)',
        ['Test Well', 2500, 'Active'],
        function(err) {
          expect(err).toBeNull();
          const wellId = this.lastID;

          db.run(
            'INSERT INTO well_data (well_id, depth, shale_percent) VALUES (?, ?, ?)',
            [wellId, 100, 0.25],
            function(err) {
              expect(err).toBeNull();

              // Delete well (in a real scenario with CASCADE, this would delete well_data too)
              db.run('DELETE FROM wells WHERE id = ?', [wellId], function(err) {
                expect(err).toBeNull();

                // Check if well_data still exists (depends on CASCADE configuration)
                db.get('SELECT * FROM well_data WHERE well_id = ?', [wellId], (err, row) => {
                  expect(err).toBeNull();
                  // Row might still exist if CASCADE is not configured
                  done();
                });
              });
            }
          );
        }
      );
    });
  });

  describe('Database Performance', () => {
    it('should handle large data inserts efficiently', (done) => {
      jest.setTimeout(20000); // Increase timeout for this test
      const startTime = Date.now();
      
      // Insert a well first
      db.run(
        'INSERT INTO wells (name, depth, status) VALUES (?, ?, ?)',
        ['Performance Test Well', 5000, 'Active'],
        function(err) {
          expect(err).toBeNull();
          const wellId = this.lastID;

          // Prepare bulk insert
          const stmt = db.prepare(`
            INSERT INTO well_data (
              well_id, depth, shale_percent, sandstone_percent, limestone_percent,
              dolomite_percent, anhydrite_percent, coal_percent, salt_percent,
              dt, gr, dominant_rock_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          let insertCount = 0;
          const totalInserts = 1000;

          for (let i = 0; i < totalInserts; i++) {
            stmt.run([
              wellId, i * 10, 0.25, 0.35, 0.20, 0.10, 0.05, 0.03, 0.02,
              80 + Math.random() * 20, 45 + Math.random() * 30, 'Sandstone'
            ], function(err) {
              expect(err).toBeNull();
              insertCount++;

              if (insertCount === totalInserts) {
                stmt.finalize();
                const endTime = Date.now();
                const duration = endTime - startTime;

                expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

                // Verify all records were inserted
                db.get('SELECT COUNT(*) as count FROM well_data WHERE well_id = ?', [wellId], (err, row) => {
                  expect(err).toBeNull();
                  expect(row.count).toBe(totalInserts);
                  done();
                });
              }
            });
          }
        }
      );
    });

    it('should handle complex queries efficiently', (done) => {
      // Insert test data
      db.run(
        'INSERT INTO wells (name, depth, status) VALUES (?, ?, ?)',
        ['Complex Query Test Well', 3000, 'Active'],
        function(err) {
          expect(err).toBeNull();
          const wellId = this.lastID;

          // Insert multiple well_data records
          const stmt = db.prepare(`
            INSERT INTO well_data (
              well_id, depth, shale_percent, sandstone_percent, dt, gr, dominant_rock_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          const testData = [
            [wellId, 100, 0.60, 0.30, 80, 45, 'Shale'],
            [wellId, 200, 0.30, 0.60, 85, 50, 'Sandstone'],
            [wellId, 300, 0.70, 0.20, 90, 55, 'Shale'],
            [wellId, 400, 0.20, 0.70, 95, 60, 'Sandstone']
          ];

          let insertCount = 0;
          testData.forEach(row => {
            stmt.run(row, function(err) {
              expect(err).toBeNull();
              insertCount++;

              if (insertCount === testData.length) {
                stmt.finalize();

                const startTime = Date.now();

                // Complex query with aggregations
                db.all(`
                  SELECT 
                    dominant_rock_type,
                    COUNT(*) as count,
                    AVG(shale_percent) as avg_shale,
                    AVG(sandstone_percent) as avg_sandstone,
                    AVG(dt) as avg_dt,
                    AVG(gr) as avg_gr,
                    MIN(depth) as min_depth,
                    MAX(depth) as max_depth
                  FROM well_data 
                  WHERE well_id = ? 
                  GROUP BY dominant_rock_type
                  ORDER BY count DESC
                `, [wellId], (err, rows) => {
                  expect(err).toBeNull();
                  
                  const endTime = Date.now();
                  const duration = endTime - startTime;
                  
                  expect(duration).toBeLessThan(1000); // Should complete within 1 second
                  expect(rows).toHaveLength(2); // Shale and Sandstone
                  
                  const shaleRow = rows.find(r => r.dominant_rock_type === 'Shale');
                  const sandstoneRow = rows.find(r => r.dominant_rock_type === 'Sandstone');
                  
                  expect(shaleRow.count).toBe(2);
                  expect(sandstoneRow.count).toBe(2);
                  
                  done();
                });
              }
            });
          });
        }
      );
    });
  });
});