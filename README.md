# Oil Drilling AI Platform

**Author: Muhammet Anil Yagiz**

A comprehensive AI-powered SaaS platform developed for Energent.ai interview process. This platform enables well drilling companies to manage, visualize, and analyze their drilling data with intelligent chatbot assistance, demonstrating advanced full-stack development capabilities and AI integration expertise.

## 🎯 Problem Statement

**Interview Project Context**: This project was developed as part of the Energent.ai technical interview process to demonstrate proficiency in full-stack development, AI integration, and modern web technologies.

Oil drilling companies face significant challenges in:
- Managing and visualizing complex drilling data from multiple wells
- Interpreting geological and drilling parameters effectively (Shale, Sandstone, Limestone, Dolomite, Anhydrite, Coal, Salt percentages)
- Making data-driven decisions for drilling operations based on Delta Time (DT) and Gamma Ray (GR) measurements
- Accessing expert knowledge for drilling analysis and recommendations

This platform addresses these challenges by providing an intuitive interface for data management, advanced visualization capabilities, and AI-powered insights specifically tailored for the oil drilling industry.

## 📋 Requirements

### Functional Requirements
1. **Well List Management**: Display and manage multiple wells with status tracking
2. **File Upload System**: Upload and process Excel files containing drilling data
3. **Data Visualization**: Interactive charts showing depth vs. rock composition, DT, and GR measurements
4. **AI Chatbot**: Intelligent assistant for data analysis and drilling recommendations
5. **Responsive Design**: Cross-device compatibility (desktop, tablet, mobile)

### Technical Requirements
- React.js frontend with modern UI components
- Node.js/Express backend API
- SQLite database for data persistence
- OpenAI integration for AI capabilities
- GitHub Pages deployment
- CI/CD pipeline with GitHub Actions

## 🏗️ Proposed Architecture

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express API    │    │   SQLite DB     │
│                 │    │                 │    │                 │
│ • Dashboard     │◄──►│ • File Upload   │◄──►│ • Wells Data    │
│ • Visualization │    │ • Data Processing│    │ • Uploaded Files│
│ • Chatbot UI    │    │ • OpenAI API    │    │ • Chat History  │
│ • File Upload   │    │ • Authentication│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  GitHub Pages   │    │   OpenAI API    │
│   (Frontend)    │    │   (AI Chat)     │
└─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Frontend**: React 18, Tailwind CSS, Recharts, Lucide React
- **Backend**: Node.js, Express.js, Multer, XLSX
- **Database**: SQLite3
- **AI**: OpenAI GPT-3.5-turbo
- **Deployment**: GitHub Pages + GitHub Actions
- **Version Control**: Git

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                     │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard  │  Well List  │  Data Viz  │  Chatbot  │  Upload   │
├─────────────────────────────────────────────────────────────────┤
│                      Application Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  React Router  │  State Mgmt  │  API Calls  │  File Handling   │
├─────────────────────────────────────────────────────────────────┤
│                       Business Logic Layer                      │
├─────────────────────────────────────────────────────────────────┤
│  File Processing  │  Data Analysis  │  AI Integration  │  Auth   │
├─────────────────────────────────────────────────────────────────┤
│                        Data Access Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  SQLite Database  │  File System  │  OpenAI API  │  External APIs│
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/anilyagiz/oil-drilling-ai-platform.git
   cd oil-drilling-ai-platform
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cp server/env.example server/.env
   # Edit server/.env and add your OpenAI API key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to GitHub Pages**
   - Push to main branch
   - GitHub Actions will automatically deploy to GitHub Pages

## 🔧 Configuration

### Environment Variables
```env
OPENAI_API_KEY=your-openai-api-key-here
PORT=5000
NODE_ENV=production
DB_PATH=./well_data.db
```

### Database Schema
```sql
-- Wells table
CREATE TABLE wells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  depth INTEGER,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Well data table (updated for actual Excel structure)
CREATE TABLE well_data (
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (well_id) REFERENCES wells (id)
);

-- Uploaded files table
CREATE TABLE uploaded_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT,
  file_size INTEGER,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Excel Data Format
The platform expects Excel files with the following structure (based on the provided sample):

| Column | Description | Unit |
|--------|-------------|------|
| DEPTH | Well depth measurements | meters |
| %SH | Shale percentage | % |
| %SS | Sandstone percentage | % |
| %LS | Limestone percentage | % |
| %DOL | Dolomite percentage | % |
| %ANH | Anhydrite percentage | % |
| %Coal | Coal percentage | % |
| %Salt | Salt percentage | % |
| DT | Delta Time measurements | μs/ft |
| GR | Gamma Ray readings | API |

## 📈 Features

### 1. Well Management
- **Well List Panel**: Left sidebar displaying wells with names, depths, and status
- **Well Selection**: Dynamic dashboard updates based on selected well
- **Status Tracking**: Active, Inactive, Maintenance status indicators

### 2. Data Upload & Processing
- **Excel File Upload**: Drag-and-drop or file picker interface
- **Data Validation**: File type and size validation
- **Data Processing**: Automatic parsing of Excel files
- **Error Handling**: Comprehensive error messages and fallbacks

### 3. Data Visualization
- **Interactive Charts**: Depth vs. Rock Composition, DT, and GR measurements
- **Multiple Chart Types**: Line charts for trend analysis
- **Data Summary**: Statistical analysis with min/max/average values
- **Responsive Design**: Charts adapt to different screen sizes

### 4. AI Chatbot Integration
- **OpenAI Integration**: GPT-3.5-turbo for intelligent responses
- **Context Awareness**: Bot understands current well and data context
- **Quick Questions**: Pre-defined common queries
- **Fallback Responses**: Offline functionality when API is unavailable

### 5. Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Tablet Support**: Adaptive layout for tablet screens
- **Desktop Enhancement**: Full-featured desktop experience

## 🔄 CI/CD Pipeline

### GitHub Actions CI/CD Pipeline

Our comprehensive CI/CD pipeline includes multiple workflows:

#### 1. **Main Deployment Pipeline** (`.github/workflows/deploy.yml`)
```yaml
Jobs:
  - test: Multi-node testing (Node 18, 20)
  - build-and-deploy: Production deployment
  - security: Vulnerability scanning
```

**Features:**
- ✅ **Multi-version testing** (Node 18 & 20)
- ✅ **Automated testing** with coverage reports
- ✅ **Security auditing** with npm audit
- ✅ **Vulnerability scanning** with Trivy
- ✅ **GitHub Pages deployment**
- ✅ **Build optimization** and caching

#### 2. **Backend Deployment** (`.github/workflows/backend-deploy.yml`)
```yaml
Jobs:
  - test-backend: Server testing
  - deploy-backend: Multi-platform deployment
  - migrate-database: Database migrations
```

**Supported Platforms:**
- 🚀 **Railway** (Primary)
- 🚀 **Heroku** (Alternative)
- 🚀 **DigitalOcean App Platform** (Alternative)

#### 3. **Monitoring & Health Checks** (`.github/workflows/monitoring.yml`)
```yaml
Jobs:
  - health-check: API and database health
  - security-monitoring: Continuous security scanning
  - performance-monitoring: Performance metrics
  - database-maintenance: Automated maintenance
```

**Monitoring Features:**
- 📊 **Health checks** every 6 hours
- 🛡️ **Security scanning** and dependency updates
- ⚡ **Performance monitoring** and optimization
- 💾 **Database maintenance** and backups

### Deployment Strategy
1. **Automatic Deployment**: Push to main branch triggers deployment
2. **Build Process**: Automated build and optimization
3. **Static Hosting**: GitHub Pages for frontend hosting
4. **Version Control**: Git-based versioning and rollback capability

## 🛠️ Development & Maintenance

### Code Organization
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── styles/         # CSS and styling
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── server/                 # Node.js backend
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   └── utils/              # Server utilities
├── .github/
│   └── workflows/          # CI/CD configuration
└── docs/                   # Documentation
```

### Testing Strategy
- **Unit Tests**: Component and function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full application workflow testing
- **Performance Tests**: Load and stress testing

### Monitoring & Analytics
- **Error Tracking**: Centralized error logging
- **Performance Monitoring**: Response time tracking
- **Usage Analytics**: User interaction monitoring
- **Health Checks**: System status monitoring

## 🔒 Security Considerations

### Data Protection
- **File Upload Security**: File type and size validation
- **API Security**: CORS configuration and rate limiting
- **Data Encryption**: Sensitive data encryption at rest
- **Input Validation**: Comprehensive input sanitization

### Authentication & Authorization
- **API Key Management**: Secure OpenAI API key handling
- **Session Management**: Secure session handling
- **Access Control**: Role-based access control (future enhancement)

## 🚀 Future Enhancements

### Phase 2 Features
- **User Authentication**: Login/signup system
- **Multi-tenant Support**: Support for multiple companies
- **Advanced Analytics**: Machine learning insights
- **Real-time Updates**: WebSocket integration
- **Mobile App**: React Native mobile application

### Scalability Improvements
- **Database Migration**: PostgreSQL for production
- **Caching Layer**: Redis for performance optimization
- **Load Balancing**: Multiple server instances
- **CDN Integration**: Global content delivery

## 📝 API Documentation

### Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-backend-url.com/api`

### Authentication
Currently, the API does not require authentication. Future versions will implement API key authentication.

### Endpoints

#### 1. File Upload
Upload Excel files containing drilling data for processing and analysis.

```http
POST /api/upload
Content-Type: multipart/form-data
```

**Request Body:**
- `file`: Excel file (.xlsx or .xls) containing drilling data

**Expected Excel Structure:**
| Column | Type | Description | Unit |
|--------|------|-------------|------|
| DEPTH | Number | Well depth measurements | meters |
| %SH | Number | Shale percentage | % |
| %SS | Number | Sandstone percentage | % |
| %LS | Number | Limestone percentage | % |
| %DOL | Number | Dolomite percentage | % |
| %ANH | Number | Anhydrite percentage | % |
| %Coal | Number | Coal percentage | % |
| %Salt | Number | Salt percentage | % |
| DT | Number | Delta Time measurements | μs/ft |
| GR | Number | Gamma Ray readings | API |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "File uploaded and processed successfully",
  "data": {
    "filename": "oil_drilling_data.xlsx",
    "rowCount": 1500,
    "processedData": {
      "DEPTH": [0, 10, 20, ...],
      "rockComposition": {
        "SH": [45.2, 43.1, 41.8, ...],
        "SS": [30.5, 32.1, 33.2, ...],
        "LS": [15.3, 16.8, 17.1, ...],
        "DOL": [5.2, 4.9, 4.8, ...],
        "ANH": [2.1, 1.8, 1.9, ...],
        "Coal": [1.2, 0.8, 0.7, ...],
        "Salt": [0.5, 0.5, 0.5, ...]
      },
      "DT": [120.5, 118.3, 115.7, ...],
      "GR": [85.2, 87.1, 89.3, ...]
    },
    "statistics": {
      "depthRange": { "min": 0, "max": 3000 },
      "averageGR": 86.7,
      "averageDT": 118.2
    }
  }
}
```

**Error Responses:**
```json
// 400 Bad Request - Invalid file format
{
  "success": false,
  "error": "Invalid file format. Please upload .xlsx or .xls files only."
}

// 400 Bad Request - Missing required columns
{
  "success": false,
  "error": "Missing required columns: DEPTH, %SH, %SS",
  "requiredColumns": ["DEPTH", "%SH", "%SS", "%LS", "%DOL", "%ANH", "%Coal", "%Salt", "DT", "GR"]
}

// 413 Payload Too Large
{
  "success": false,
  "error": "File size exceeds maximum limit of 10MB"
}
```

#### 2. AI Chat
Interact with the AI chatbot for drilling data analysis and recommendations.

```http
POST /api/chat
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What can you tell me about the rock composition at depth 1500m?",
  "wellData": {
    "wellId": 1,
    "wellName": "Well A-1",
    "currentDepth": 1500
  },
  "uploadedData": {
    "filename": "drilling_data.xlsx",
    "dataPoints": 1500,
    "depthRange": { "min": 0, "max": 3000 }
  },
  "sessionId": "chat-session-123" // Optional for conversation continuity
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "response": "At depth 1500m, the rock composition shows predominantly shale (42%) and sandstone (35%), with limestone making up 18% of the formation. The Delta Time reading of 115 μs/ft suggests good porosity, while the Gamma Ray value of 89 API indicates moderate clay content. This formation appears suitable for drilling with standard mud weight.",
  "metadata": {
    "responseTime": 1.2,
    "tokensUsed": 150,
    "confidence": 0.85,
    "dataPointsAnalyzed": 50
  },
  "suggestions": [
    "Consider adjusting mud weight for optimal drilling",
    "Monitor for potential shale instability",
    "Evaluate completion strategy for this formation"
  ]
}
```

**Error Responses:**
```json
// 400 Bad Request - Missing message
{
  "success": false,
  "error": "Message is required"
}

// 503 Service Unavailable - OpenAI API error
{
  "success": false,
  "error": "AI service temporarily unavailable",
  "fallbackResponse": "I'm currently unable to provide AI analysis. Please try again later or contact support."
}
```

#### 3. Wells Management
Retrieve and manage well information.

```http
GET /api/wells
```

**Response (200 OK):**
```json
{
  "success": true,
  "wells": [
    {
      "id": 1,
      "name": "Well A-1",
      "depth": 3000,
      "status": "active",
      "location": {
        "latitude": 29.7604,
        "longitude": -95.3698
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "lastUpdated": "2024-01-20T14:45:00Z",
      "dataPoints": 1500,
      "completionStatus": "drilling"
    },
    {
      "id": 2,
      "name": "Well B-2",
      "depth": 2500,
      "status": "inactive",
      "location": {
        "latitude": 29.7505,
        "longitude": -95.3599
      },
      "createdAt": "2024-01-10T08:15:00Z",
      "lastUpdated": "2024-01-18T16:20:00Z",
      "dataPoints": 1250,
      "completionStatus": "completed"
    }
  ],
  "totalCount": 2,
  "activeWells": 1,
  "inactiveWells": 1
}
```

#### 4. Well Data Retrieval
Get detailed drilling data for a specific well.

```http
GET /api/wells/:id/data
```

**Query Parameters:**
- `startDepth` (optional): Starting depth for data range
- `endDepth` (optional): Ending depth for data range
- `limit` (optional): Maximum number of data points to return (default: 1000)
- `format` (optional): Response format ('json' or 'csv', default: 'json')

**Example Request:**
```http
GET /api/wells/1/data?startDepth=1000&endDepth=2000&limit=500
```

**Response (200 OK):**
```json
{
  "success": true,
  "wellId": 1,
  "wellName": "Well A-1",
  "dataRange": {
    "startDepth": 1000,
    "endDepth": 2000,
    "totalPoints": 500
  },
  "data": [
    {
      "depth": 1000,
      "rockComposition": {
        "shale": 45.2,
        "sandstone": 30.5,
        "limestone": 15.3,
        "dolomite": 5.2,
        "anhydrite": 2.1,
        "coal": 1.2,
        "salt": 0.5
      },
      "measurements": {
        "deltaTime": 120.5,
        "gammaRay": 85.2
      },
      "timestamp": "2024-01-15T10:30:00Z"
    }
    // ... more data points
  ],
  "statistics": {
    "averages": {
      "shale": 43.8,
      "sandstone": 31.2,
      "deltaTime": 118.7,
      "gammaRay": 86.4
    },
    "ranges": {
      "deltaTime": { "min": 110.2, "max": 125.8 },
      "gammaRay": { "min": 78.5, "max": 94.2 }
    }
  }
}
```

#### 5. Health Check
Monitor API and system health.

```http
GET /api/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T15:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "connected",
      "responseTime": 12
    },
    "openai": {
      "status": "available",
      "responseTime": 245
    },
    "fileSystem": {
      "status": "accessible",
      "freeSpace": "15.2GB"
    }
  },
  "metrics": {
    "uptime": "72h 15m 30s",
    "totalRequests": 1547,
    "averageResponseTime": 156,
    "errorRate": 0.02
  }
}
```

### Error Handling

All API endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-20T15:30:00Z",
  "requestId": "req-123456789"
}
```

**Common HTTP Status Codes:**
- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `413 Payload Too Large`: File size exceeds limit
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

### Rate Limiting

API endpoints are rate-limited to ensure fair usage:
- **File Upload**: 10 requests per minute per IP
- **Chat**: 30 requests per minute per IP
- **Data Retrieval**: 100 requests per minute per IP
- **Health Check**: 60 requests per minute per IP

### SDK and Integration Examples

#### JavaScript/Node.js Example
```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// File upload example
async function uploadDrillingData(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  
  try {
    const response = await axios.post('http://localhost:5000/api/upload', form, {
      headers: form.getHeaders()
    });
    console.log('Upload successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Upload failed:', error.response.data);
    throw error;
  }
}

// Chat example
async function askAI(message, wellData, uploadedData) {
  try {
    const response = await axios.post('http://localhost:5000/api/chat', {
      message,
      wellData,
      uploadedData
    });
    return response.data.response;
  } catch (error) {
    console.error('Chat failed:', error.response.data);
    throw error;
  }
}
```

#### Python Example
```python
import requests
import json

# File upload example
def upload_drilling_data(file_path):
    url = 'http://localhost:5000/api/upload'
    
    with open(file_path, 'rb') as file:
        files = {'file': file}
        response = requests.post(url, files=files)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Upload failed: {response.json()}")

# Chat example
def ask_ai(message, well_data=None, uploaded_data=None):
    url = 'http://localhost:5000/api/chat'
    payload = {
        'message': message,
        'wellData': well_data,
        'uploadedData': uploaded_data
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        return response.json()['response']
    else:
        raise Exception(f"Chat failed: {response.json()}")
```



---

**Built with ❤️ for Energent.ai Interview Process**

*This project demonstrates advanced full-stack development capabilities, AI integration expertise, and modern web development best practices. Developed by Muhammet Anil Yagiz as part of the technical interview process for Energent.ai.*
