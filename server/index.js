const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({
  // Handle malformed JSON
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.static(path.join(__dirname, '../client/build')));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
});

// Database migration function
function runDatabaseMigrations(db) {
  return new Promise((resolve, reject) => {
    // Check if we need to migrate the well_data table
    db.get("PRAGMA table_info(well_data)", (err, row) => {
      if (err) {
        console.error('Error checking table structure:', err);
        reject(err);
        return;
      }

      // Get all columns in the current table
      db.all("PRAGMA table_info(well_data)", (err, columns) => {
        if (err) {
          console.error('Error getting table info:', err);
          reject(err);
          return;
        }

        const columnNames = columns.map(col => col.name);
        const hasOldStructure = columnNames.includes('rock_composition') && !columnNames.includes('shale_percent');

        if (hasOldStructure) {
          console.log('Migrating well_data table to new structure...');
          
          // Create new table with updated structure
          db.run(`CREATE TABLE well_data_new (
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
          )`, (err) => {
            if (err) {
              console.error('Error creating new table:', err);
              reject(err);
              return;
            }

            // Copy existing data (if any) - note: old rock_composition data will be lost
            db.run(`INSERT INTO well_data_new (id, well_id, depth, dt, gr, created_at)
                    SELECT id, well_id, depth, dt, gr, created_at FROM well_data`, (err) => {
              if (err && !err.message.includes('no such table')) {
                console.error('Error copying data:', err);
                reject(err);
                return;
              }

              // Drop old table and rename new one
              db.run('DROP TABLE IF EXISTS well_data', (err) => {
                if (err) {
                  console.error('Error dropping old table:', err);
                  reject(err);
                  return;
                }

                db.run('ALTER TABLE well_data_new RENAME TO well_data', (err) => {
                  if (err) {
                    console.error('Error renaming table:', err);
                    reject(err);
                    return;
                  }

                  console.log('Database migration completed successfully');
                  resolve();
                });
              });
            });
          });
        } else {
          console.log('Database schema is up to date');
          resolve();
        }
      });
    });
  });
}

// Database setup
let db;

function initializeDatabase() {
  // Use a test database when running tests
  const dbPath = process.env.NODE_ENV === 'test' ? './test_well_data.db' : './well_data.db';
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log(`Connected to SQLite database: ${dbPath}`);
      
      // Create tables with new structure
      db.run(`CREATE TABLE IF NOT EXISTS wells (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        depth INTEGER,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS well_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        well_id INTEGER,
        depth REAL,
        shale_percent REAL,        -- %SH
        sandstone_percent REAL,    -- %SS
        limestone_percent REAL,    -- %LS
        dolomite_percent REAL,     -- %DOL
        anhydrite_percent REAL,    -- %ANH
        coal_percent REAL,         -- %Coal
        salt_percent REAL,         -- %Salt
        dt REAL,                   -- Delta Time
        gr REAL,                   -- Gamma Ray
        dominant_rock_type TEXT,   -- Calculated dominant rock type
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (well_id) REFERENCES wells (id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS uploaded_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT,
        file_size INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        message TEXT NOT NULL,
        response TEXT NOT NULL,
        well_id INTEGER,
        uploaded_file_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (well_id) REFERENCES wells (id),
        FOREIGN KEY (uploaded_file_id) REFERENCES uploaded_files (id)
      )`);

      // Run migrations if needed
      runDatabaseMigrations(db).catch(migrationError => {
        console.error('Migration failed:', migrationError);
      });
    }
  });
}

// Initialize the database
initializeDatabase();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all files and validate them later
    cb(null, true);
  }
});

// Ensure uploads directory exists
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Routes

// Health check with detailed system status
app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'OK',
      openai: 'OK'
    }
  };

  // Check database connection
  db.get('SELECT 1', (err) => {
    if (err) {
      healthCheck.services.database = 'ERROR';
      healthCheck.status = 'DEGRADED';
    }

    // Check OpenAI API (basic check)
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      healthCheck.services.openai = 'NOT_CONFIGURED';
      if (healthCheck.status === 'OK') {
        healthCheck.status = 'DEGRADED';
      }
    }

    const statusCode = healthCheck.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthCheck);
  });
});

// Excel data validation function
function validateExcelStructure(data) {
  const requiredColumns = ['DEPTH', '%SH', '%SS', '%LS', '%DOL', '%ANH', '%Coal', '%Salt', 'DT', 'GR'];
  const errors = [];
  
  if (!data || data.length === 0) {
    errors.push('Excel file is empty or contains no data');
    return { isValid: false, errors };
  }

  // Check if we have headers (first row should contain column names)
  const headers = Object.keys(data[0]);
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Validate data types and ranges
  data.forEach((row, index) => {
    const rowNum = index + 1;
    
    // Validate DEPTH (should be numeric and positive)
    if (row.DEPTH !== null && row.DEPTH !== undefined) {
      if (typeof row.DEPTH !== 'number' || row.DEPTH < 0) {
        errors.push(`Row ${rowNum}: DEPTH must be a positive number`);
      }
    }

    // Validate percentage columns (should be between 0 and 1)
    const percentageColumns = ['%SH', '%SS', '%LS', '%DOL', '%ANH', '%Coal', '%Salt'];
    percentageColumns.forEach(col => {
      if (row[col] !== null && row[col] !== undefined) {
        if (typeof row[col] !== 'number' || row[col] < 0 || row[col] > 1) {
          errors.push(`Row ${rowNum}: ${col} must be a number between 0 and 1`);
        }
      }
    });

    // Validate DT and GR (should be numeric)
    ['DT', 'GR'].forEach(col => {
      if (row[col] !== null && row[col] !== undefined) {
        if (typeof row[col] !== 'number') {
          errors.push(`Row ${rowNum}: ${col} must be a number`);
        }
      }
    });

    // Check if rock composition percentages sum to approximately 1 (allowing for small rounding errors)
    const rockCompositionSum = (row['%SH'] || 0) + (row['%SS'] || 0) + (row['%LS'] || 0) + 
                              (row['%DOL'] || 0) + (row['%ANH'] || 0) + (row['%Coal'] || 0) + (row['%Salt'] || 0);
    if (Math.abs(rockCompositionSum - 1) > 0.01) {
      errors.push(`Row ${rowNum}: Rock composition percentages should sum to approximately 1.0 (current sum: ${rockCompositionSum.toFixed(3)})`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    totalRows: data.length,
    columns: headers
  };
}

// Enhanced Excel data processing function
function processExcelData(data) {
  return data.map((row, index) => {
    const processedRow = {
      DEPTH: parseFloat(row.DEPTH) || null,
      SH: parseFloat(row['%SH']) || 0,     // Shale percentage
      SS: parseFloat(row['%SS']) || 0,     // Sandstone percentage
      LS: parseFloat(row['%LS']) || 0,     // Limestone percentage
      DOL: parseFloat(row['%DOL']) || 0,   // Dolomite percentage
      ANH: parseFloat(row['%ANH']) || 0,   // Anhydrite percentage
      Coal: parseFloat(row['%Coal']) || 0, // Coal percentage
      Salt: parseFloat(row['%Salt']) || 0, // Salt percentage
      DT: parseFloat(row.DT) || null,      // Delta Time
      GR: parseFloat(row.GR) || null,      // Gamma Ray
      rowIndex: index + 1
    };

    // Calculate dominant rock type
    const rockTypes = {
      'Shale': processedRow.SH,
      'Sandstone': processedRow.SS,
      'Limestone': processedRow.LS,
      'Dolomite': processedRow.DOL,
      'Anhydrite': processedRow.ANH,
      'Coal': processedRow.Coal,
      'Salt': processedRow.Salt
    };

    processedRow.dominantRockType = Object.keys(rockTypes).reduce((a, b) => 
      rockTypes[a] > rockTypes[b] ? a : b
    );

    return processedRow;
  });
}

// Upload Excel file
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        details: 'Please select an Excel file to upload'
      });
    }

    console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Check file extension early
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({ 
        error: 'Only Excel files are allowed',
        details: 'Please upload a file with .xlsx or .xls extension'
      });
    }

    // Read Excel file
    let workbook;
    try {
      workbook = XLSX.readFile(req.file.path);
    } catch (xlsxError) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        error: 'Invalid Excel file format',
        message: 'Please ensure you are uploading a valid Excel file (.xlsx or .xls)',
        details: xlsxError.message
      });
    }
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        error: 'Invalid Excel file structure',
        details: ['Excel file contains no worksheets']
      });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        error: 'Invalid Excel file structure',
        details: ['Unable to read worksheet data']
      });
    }

    // Convert to JSON with proper handling
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null,
      blankrows: false
    });

    // Handle completely empty files
    if (rawData.length === 0) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        error: 'Invalid Excel file structure',
        details: ['Excel file is empty or contains no data']
      });
    }

    if (rawData.length < 2) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        error: 'Invalid Excel file structure',
        details: ['Excel file must contain at least a header row and one data row']
      });
    }

    // Convert array format to object format using first row as headers
    const headers = rawData[0];
    const dataRows = rawData.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    // Validate Excel structure
    const validation = validateExcelStructure(dataRows);
    
    if (!validation.isValid) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        error: 'Invalid Excel file structure',
        details: validation.errors,
        suggestions: [
          'Ensure your Excel file contains all required columns: DEPTH, %SH, %SS, %LS, %DOL, %ANH, %Coal, %Salt, DT, GR',
          'Check that percentage values are between 0 and 1',
          'Verify that DEPTH values are positive numbers',
          'Ensure DT and GR values are numeric'
        ]
      });
    }

    // Process data with enhanced logic
    const processedData = processExcelData(dataRows);

    // Check if we have any data rows
    if (processedData.length === 0) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      return res.status(400).json({
        error: 'Invalid Excel file structure',
        details: ['Excel file contains no data rows. Please ensure your file contains at least one row of data.']
      });
    }

    // Calculate summary statistics
    const stats = {
      totalRows: processedData.length,
      depthRange: {
        min: Math.min(...processedData.map(row => row.DEPTH).filter(d => d !== null)),
        max: Math.max(...processedData.map(row => row.DEPTH).filter(d => d !== null))
      },
      rockTypeDistribution: {},
      averages: {
        DT: processedData.reduce((sum, row) => sum + (row.DT || 0), 0) / processedData.length,
        GR: processedData.reduce((sum, row) => sum + (row.GR || 0), 0) / processedData.length
      }
    };

    // Calculate rock type distribution
    processedData.forEach(row => {
      const rockType = row.dominantRockType;
      stats.rockTypeDistribution[rockType] = (stats.rockTypeDistribution[rockType] || 0) + 1;
    });

    // Store file info in database
    db.run(
      'INSERT INTO uploaded_files (filename, original_name, file_size) VALUES (?, ?, ?)',
      [req.file.filename, req.file.originalname, req.file.size],
      function(err) {
        if (err) {
          console.error('Error saving file info:', err);
        } else {
          console.log(`File info saved with ID: ${this.lastID}`);
        }
      }
    );

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    console.log(`Successfully processed ${processedData.length} rows from ${req.file.originalname}`);

    res.json({
      message: 'File uploaded and processed successfully',
      rows: processedData,
      totalRows: processedData.length,
      statistics: stats,
      validation: {
        isValid: true,
        columnsFound: validation.columns,
        warnings: validation.errors.length > 0 ? validation.errors : []
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    // Return appropriate error status based on error type
    if (error.message.includes('Invalid Excel file structure') || 
        error.message.includes('Excel file is empty') ||
        error.message.includes('Invalid Excel file format') ||
        error.message.includes('No file uploaded')) {
      return res.status(400).json({ 
        error: 'Invalid Excel file structure',
        message: error.message,
        details: 'Please ensure your Excel file follows the required format with columns: DEPTH, %SH, %SS, %LS, %DOL, %ANH, %Coal, %Salt, DT, GR'
      });
    }

    res.status(500).json({ 
      error: 'Failed to process file',
      message: error.message,
      details: 'Please ensure your Excel file follows the required format with columns: DEPTH, %SH, %SS, %LS, %DOL, %ANH, %Coal, %Salt, DT, GR'
    });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, wellData, uploadedData, sessionId, enhancedContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate session ID if not provided
    const chatSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare enhanced context for the AI
    let context = "You are an AI assistant specialized in oil drilling data analysis with expertise in geological interpretation, drilling parameters, and formation evaluation. ";
    
    if (wellData) {
      context += `Current well: ${wellData.name}, Depth: ${wellData.depth}m, Status: ${wellData.status}. `;
    }
    
    if (uploadedData && uploadedData.rows) {
      context += `Available drilling data includes ${uploadedData.rows.length} data points with detailed rock composition analysis including: DEPTH, Shale (%SH), Sandstone (%SS), Limestone (%LS), Dolomite (%DOL), Anhydrite (%ANH), Coal (%Coal), Salt (%Salt) percentages, DT (Delta Time), and GR (Gamma Ray) measurements. `;
      
      // Add enhanced statistics to context
      if (uploadedData.statistics) {
        const stats = uploadedData.statistics;
        context += `Data summary: Depth range ${stats.depthRange.min}m to ${stats.depthRange.max}m, Average DT: ${stats.averages.DT.toFixed(2)} μs/ft, Average GR: ${stats.averages.GR.toFixed(2)} API. `;
        
        // Add rock type distribution with percentages
        const totalIntervals = Object.values(stats.rockTypeDistribution).reduce((sum, count) => sum + count, 0);
        const rockTypes = Object.entries(stats.rockTypeDistribution)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([type, count]) => `${type}: ${count} intervals (${((count/totalIntervals)*100).toFixed(1)}%)`)
          .join(', ');
        context += `Dominant rock types: ${rockTypes}. `;
      }

      // Add enhanced context insights if available
      if (enhancedContext && enhancedContext.dataInsights) {
        const insights = enhancedContext.dataInsights;
        
        if (insights.rockComposition) {
          const dominantRock = Object.entries(insights.rockComposition.dominantRockTypes)
            .sort(([,a], [,b]) => b - a)[0];
          if (dominantRock) {
            context += `Most common rock type: ${dominantRock[0]} (${dominantRock[1]} intervals). `;
          }
        }

        if (insights.drillingParameters) {
          const dt = insights.drillingParameters.dt;
          const gr = insights.drillingParameters.gr;
          context += `DT range: ${dt.min.toFixed(1)}-${dt.max.toFixed(1)} μs/ft (trend: ${dt.trend}), GR range: ${gr.min.toFixed(1)}-${gr.max.toFixed(1)} API (trend: ${gr.trend}). `;
        }

        if (insights.anomalies && insights.anomalies.length > 0) {
          context += `Data anomalies detected: ${insights.anomalies.length} potential issues including ${insights.anomalies.map(a => a.type).join(', ')}. `;
        }

        // Add message type context for more targeted responses
        if (enhancedContext.messageType) {
          switch (enhancedContext.messageType) {
            case 'rock_composition':
              context += "Focus on geological interpretation and rock composition analysis. ";
              break;
            case 'dt_analysis':
              context += "Focus on Delta Time measurements and porosity/density implications. ";
              break;
            case 'gr_analysis':
              context += "Focus on Gamma Ray readings and clay content interpretation. ";
              break;
            case 'recommendation_request':
              context += "Provide specific, actionable drilling recommendations based on the data. ";
              break;
            case 'data_analysis':
              context += "Provide comprehensive data analysis with specific insights and patterns. ";
              break;
            case 'problem_solving':
              context += "Focus on identifying and solving potential drilling challenges. ";
              break;
          }
        }
      }
    }

    context += "Provide helpful, accurate, and specific information about drilling data analysis, geological interpretation, and drilling recommendations. Use technical terminology appropriately and explain complex concepts clearly. When referencing data, be specific about values and trends. ";

    let response;
    let isAIResponse = true;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: context
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      response = completion.choices[0].message.content;
    } catch (aiError) {
      console.error('OpenAI API error:', aiError);
      response = generateFallbackResponse(message, wellData, uploadedData);
      isAIResponse = false;
    }

    // Store chat history in database
    const wellId = wellData ? wellData.id : null;
    const uploadedFileId = uploadedData ? uploadedData.fileId : null;

    db.run(
      'INSERT INTO chat_history (session_id, message, response, well_id, uploaded_file_id) VALUES (?, ?, ?, ?, ?)',
      [chatSessionId, message, response, wellId, uploadedFileId],
      function(err) {
        if (err) {
          console.error('Error saving chat history:', err);
        } else {
          console.log(`Chat history saved with ID: ${this.lastID}`);
        }
      }
    );

    res.json({ 
      response,
      sessionId: chatSessionId,
      isAIResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    // Fallback response if everything fails
    const fallbackResponse = generateFallbackResponse(req.body.message, req.body.wellData, req.body.uploadedData);
    res.json({ 
      response: fallbackResponse,
      sessionId: req.body.sessionId || `fallback_${Date.now()}`,
      isAIResponse: false,
      error: 'Service temporarily unavailable'
    });
  }
});

// Enhanced fallback response generator with Excel data awareness
function generateFallbackResponse(message, wellData, uploadedData) {
  const lowerMessage = message.toLowerCase();
  
  // Depth-related queries
  if (lowerMessage.includes('depth')) {
    if (uploadedData && uploadedData.statistics && uploadedData.statistics.depthRange) {
      const depthRange = uploadedData.statistics.depthRange;
      return `Based on your uploaded data, the depth range spans from ${depthRange.min}m to ${depthRange.max}m (total interval: ${(depthRange.max - depthRange.min).toFixed(1)}m). The data contains ${uploadedData.rows.length} measurement points across this interval.`;
    }
    if (wellData) {
      return `The current drilling depth for ${wellData.name} is ${wellData.depth}m. This is a ${wellData.status.toLowerCase()} well.`;
    }
    return "Depth information is not available. Please select a well or upload drilling data to see depth analysis.";
  }
  
  // Rock composition analysis
  if (lowerMessage.includes('rock composition') || lowerMessage.includes('composition') || 
      lowerMessage.includes('shale') || lowerMessage.includes('sandstone') || 
      lowerMessage.includes('limestone') || lowerMessage.includes('dolomite')) {
    
    if (uploadedData && uploadedData.statistics && uploadedData.statistics.rockTypeDistribution) {
      const rockDist = uploadedData.statistics.rockTypeDistribution;
      const totalIntervals = Object.values(rockDist).reduce((sum, count) => sum + count, 0);
      const dominantRocks = Object.entries(rockDist)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([type, count]) => `${type}: ${((count/totalIntervals)*100).toFixed(1)}%`)
        .join(', ');
      
      return `Based on your uploaded data, the rock composition analysis shows: ${dominantRocks}. This distribution across ${totalIntervals} intervals indicates the geological complexity of your formation. The dominant rock types will influence drilling parameters, mud selection, and completion strategies.`;
    }
    
    return "Rock composition data shows the geological makeup of the formation with detailed percentages for Shale (%SH), Sandstone (%SS), Limestone (%LS), Dolomite (%DOL), Anhydrite (%ANH), Coal (%Coal), and Salt (%Salt). This data helps identify formation types and drilling challenges. Please upload your Excel file to see specific composition analysis.";
  }
  
  // DT (Delta Time) analysis
  if (lowerMessage.includes('dt') || lowerMessage.includes('delta time')) {
    if (uploadedData && uploadedData.statistics && uploadedData.statistics.averages) {
      const avgDT = uploadedData.statistics.averages.DT;
      let interpretation = "";
      
      if (avgDT < 60) {
        interpretation = "indicating relatively dense, low-porosity formations (likely carbonates or tight sandstones)";
      } else if (avgDT > 100) {
        interpretation = "suggesting higher porosity formations or potentially unconsolidated sediments";
      } else {
        interpretation = "indicating moderate porosity formations typical of many reservoir rocks";
      }
      
      return `Your uploaded data shows an average DT of ${avgDT.toFixed(1)} μs/ft, ${interpretation}. DT measurements help evaluate porosity and rock density, which are crucial for reservoir characterization and drilling optimization.`;
    }
    
    return "DT (Delta Time) measurements indicate acoustic travel time through the formation. Lower DT values (40-60 μs/ft) typically suggest denser rocks like carbonates, while higher values (80-140 μs/ft) indicate more porous formations like sandstones. Upload your data to see specific DT analysis.";
  }
  
  // GR (Gamma Ray) analysis
  if (lowerMessage.includes('gr') || lowerMessage.includes('gamma ray')) {
    if (uploadedData && uploadedData.statistics && uploadedData.statistics.averages) {
      const avgGR = uploadedData.statistics.averages.GR;
      let interpretation = "";
      
      if (avgGR < 50) {
        interpretation = "indicating clean formations (sandstones or carbonates) with low clay content";
      } else if (avgGR > 100) {
        interpretation = "suggesting shale-rich or clay-bearing formations";
      } else {
        interpretation = "indicating mixed lithology with moderate clay content";
      }
      
      return `Your uploaded data shows an average GR of ${avgGR.toFixed(1)} API, ${interpretation}. GR readings help distinguish between clean reservoir rocks and clay-rich formations, guiding completion and stimulation strategies.`;
    }
    
    return "GR (Gamma Ray) readings measure natural radioactivity in the formation. Lower GR values (0-50 API) typically indicate clean sandstones or carbonates, while higher values (100+ API) suggest shale or clay-rich formations. Upload your data to see specific GR analysis.";
  }
  
  // Analysis requests
  if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) {
    if (uploadedData && uploadedData.rows) {
      const insights = generateDataInsights(uploadedData);
      return `Based on your ${uploadedData.rows.length} data points: ${insights}. This analysis can help optimize drilling parameters, predict formation challenges, and plan completion strategies.`;
    }
    
    return "To provide detailed analysis, I need access to your drilling data. Please upload your Excel file containing depth, rock composition (%SH, %SS, %LS, %DOL, %ANH, %Coal, %Salt), DT, and GR measurements for comprehensive formation evaluation.";
  }
  
  // Recommendation requests
  if (lowerMessage.includes('recommend') || lowerMessage.includes('suggestion') || 
      lowerMessage.includes('advice')) {
    
    if (uploadedData && uploadedData.statistics) {
      return generateDrillingRecommendations(uploadedData);
    }
    
    return "For specific drilling recommendations, I would need to analyze your formation data. Generally, consider: 1) Monitor drilling parameters closely based on lithology changes, 2) Adjust mud weight based on formation pressure and rock strength, 3) Select appropriate bit types for dominant rock formations, 4) Plan casing points at formation boundaries. Upload your data for tailored recommendations.";
  }
  
  // Problem-solving queries
  if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || 
      lowerMessage.includes('challenge') || lowerMessage.includes('trouble')) {
    
    if (uploadedData && uploadedData.rows) {
      const anomalies = detectDataAnomalies(uploadedData.rows);
      if (anomalies.length > 0) {
        return `I've identified ${anomalies.length} potential issues in your data: ${anomalies.slice(0, 3).map(a => a.description).join('; ')}. These anomalies could indicate measurement errors, formation changes, or drilling challenges that need attention.`;
      }
      return "Your data appears consistent without obvious anomalies. Common drilling challenges include: formation pressure changes, wellbore instability in shales, lost circulation in fractured formations, and bit balling in clay-rich zones.";
    }
    
    return "Common drilling challenges include: formation pressure variations, wellbore instability in shales, lost circulation, stuck pipe, and bit performance issues. Upload your data to identify specific challenges in your formation.";
  }
  
  // General queries
  if (uploadedData && uploadedData.rows) {
    return `I have access to your drilling data with ${uploadedData.rows.length} measurement points. I can help analyze rock composition, interpret DT and GR logs, identify formation characteristics, and provide drilling recommendations. What specific aspect would you like to explore?`;
  }
  
  return "I'm here to help with drilling data analysis including rock composition interpretation, log analysis (DT, GR), formation evaluation, and drilling optimization. Please ask about specific measurements or upload your Excel data for detailed analysis.";
}

// Generate data insights for fallback responses
function generateDataInsights(uploadedData) {
  if (!uploadedData || !uploadedData.rows || !uploadedData.statistics) {
    return "insufficient data for analysis";
  }

  const stats = uploadedData.statistics;
  const insights = [];

  // Depth analysis
  const depthSpan = stats.depthRange.max - stats.depthRange.min;
  insights.push(`${depthSpan.toFixed(1)}m interval analyzed`);

  // Rock type analysis
  const dominantRock = Object.entries(stats.rockTypeDistribution)
    .sort(([,a], [,b]) => b - a)[0];
  if (dominantRock) {
    const percentage = ((dominantRock[1] / uploadedData.rows.length) * 100).toFixed(1);
    insights.push(`${dominantRock[0]} is dominant (${percentage}%)`);
  }

  // Parameter ranges
  if (stats.averages.DT) {
    insights.push(`DT averages ${stats.averages.DT.toFixed(1)} μs/ft`);
  }
  if (stats.averages.GR) {
    insights.push(`GR averages ${stats.averages.GR.toFixed(1)} API`);
  }

  return insights.join(', ');
}

// Generate drilling recommendations based on data
function generateDrillingRecommendations(uploadedData) {
  if (!uploadedData || !uploadedData.statistics) {
    return "Upload data required for specific recommendations.";
  }

  const stats = uploadedData.statistics;
  const recommendations = [];

  // Rock type based recommendations
  const rockDist = stats.rockTypeDistribution;
  const totalIntervals = Object.values(rockDist).reduce((sum, count) => sum + count, 0);
  
  const shalePercent = ((rockDist.SH || 0) / totalIntervals) * 100;
  const sandstonePercent = ((rockDist.SS || 0) / totalIntervals) * 100;
  const carbonatePercent = (((rockDist.LS || 0) + (rockDist.DOL || 0)) / totalIntervals) * 100;

  if (shalePercent > 40) {
    recommendations.push("High shale content detected - use inhibitive mud system to prevent wellbore instability");
  }
  
  if (sandstonePercent > 30) {
    recommendations.push("Significant sandstone intervals - consider PDC bits for optimal ROP");
  }
  
  if (carbonatePercent > 25) {
    recommendations.push("Carbonate formations present - roller cone bits may be more effective");
  }

  // DT based recommendations
  if (stats.averages.DT > 100) {
    recommendations.push("High DT values suggest porous formations - monitor for potential lost circulation");
  } else if (stats.averages.DT < 60) {
    recommendations.push("Low DT values indicate dense formations - expect slower drilling rates");
  }

  // GR based recommendations
  if (stats.averages.GR > 100) {
    recommendations.push("High GR readings indicate clay-rich zones - use appropriate mud additives for shale control");
  }

  if (recommendations.length === 0) {
    recommendations.push("Formation appears relatively uniform - maintain current drilling parameters and monitor for changes");
  }

  return `Drilling recommendations based on your data: ${recommendations.join('; ')}.`;
}

// Detect anomalies in uploaded data
function detectDataAnomalies(rows) {
  if (!rows || rows.length === 0) return [];

  const anomalies = [];
  
  rows.forEach((row, index) => {
    // Check rock composition sum
    const rockTypes = ['SH', 'SS', 'LS', 'DOL', 'ANH', 'Coal', 'Salt'];
    const totalComposition = rockTypes.reduce((sum, type) => {
      return sum + (row[`%${type}`] || row[type] || 0);
    }, 0);
    
    if (Math.abs(totalComposition - 100) > 15) {
      anomalies.push({
        depth: row.DEPTH,
        type: 'composition_error',
        description: `Depth ${row.DEPTH}m: rock composition sums to ${totalComposition.toFixed(1)}%`
      });
    }

    // Check for extreme values
    if (row.DT && (row.DT < 30 || row.DT > 250)) {
      anomalies.push({
        depth: row.DEPTH,
        type: 'dt_extreme',
        description: `Depth ${row.DEPTH}m: extreme DT value (${row.DT} μs/ft)`
      });
    }

    if (row.GR && (row.GR < 0 || row.GR > 400)) {
      anomalies.push({
        depth: row.DEPTH,
        type: 'gr_extreme',
        description: `Depth ${row.DEPTH}m: extreme GR value (${row.GR} API)`
      });
    }
  });

  return anomalies.slice(0, 5);
}

// Get wells list
app.get('/api/wells', (req, res) => {
  db.all('SELECT * FROM wells ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get well data
app.get('/api/wells/:id/data', (req, res) => {
  const wellId = req.params.id;
  db.all(
    'SELECT * FROM well_data WHERE well_id = ? ORDER BY depth',
    [wellId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Get chat history
app.get('/api/chat/history/:sessionId?', (req, res) => {
  const sessionId = req.params.sessionId;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  let query = 'SELECT * FROM chat_history';
  let params = [];

  if (sessionId) {
    query += ' WHERE session_id = ?';
    params.push(sessionId);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({
      history: rows,
      total: rows.length,
      limit,
      offset
    });
  });
});

// Store well data from uploaded Excel
app.post('/api/wells/:id/data', (req, res) => {
  const wellId = req.params.id;
  const { data } = req.body;

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: 'Data array is required' });
  }

  // Prepare insert statement
  const insertStmt = db.prepare(`
    INSERT INTO well_data (
      well_id, depth, shale_percent, sandstone_percent, limestone_percent,
      dolomite_percent, anhydrite_percent, coal_percent, salt_percent,
      dt, gr, dominant_rock_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let insertedCount = 0;
  let errors = [];

  // Insert each data point
  data.forEach((row, index) => {
    try {
      insertStmt.run([
        wellId,
        row.DEPTH,
        row.SH,
        row.SS,
        row.LS,
        row.DOL,
        row.ANH,
        row.Coal,
        row.Salt,
        row.DT,
        row.GR,
        row.dominantRockType
      ]);
      insertedCount++;
    } catch (err) {
      errors.push(`Row ${index + 1}: ${err.message}`);
    }
  });

  insertStmt.finalize();

  if (errors.length > 0) {
    res.status(207).json({
      message: `Partially successful: ${insertedCount} rows inserted`,
      insertedCount,
      errors
    });
  } else {
    res.json({
      message: `Successfully inserted ${insertedCount} data points`,
      insertedCount
    });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error caught by middleware:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    // Handle other multer errors
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  }
  
  // Handle custom file type errors
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: error.message });
  }
  
  // Handle file type errors
  if (error.message.includes('Invalid Excel file format') || error.message.includes('Only Excel files are allowed')) {
    return res.status(400).json({ error: error.message });
  }
  
  // Handle JSON parsing errors
  if (error.message.includes('Invalid JSON')) {
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  
  // Handle Excel file structure errors
  if (error.message.includes('Excel file contains no data rows') || 
      error.message.includes('Excel file is empty or contains no data') ||
      error.message.includes('Invalid Excel file structure')) {
    return res.status(400).json({ 
      error: 'Invalid Excel file structure',
      details: [error.message]
    });
  }
  
  // Handle general Excel processing errors
  if (error.message.includes('Excel')) {
    return res.status(400).json({ 
      error: 'Invalid Excel file',
      details: [error.message]
    });
  }
  
  res.status(500).json({ error: error.message });
});

// Only start the server if this file is run directly (not imported)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the application`);
  });
}

module.exports = app;
